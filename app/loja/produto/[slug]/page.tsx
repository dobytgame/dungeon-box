import type { Metadata } from 'next';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/seo/JsonLd';
import PriceBadge from '@/components/shop/PriceBadge';
import ProductGallery from '@/components/shop/ProductGallery';
import ProductTabs from '@/components/shop/ProductTabs';
import RelatedProducts from '@/components/shop/RelatedProducts';
import StoreProductAnalytics from '@/components/store/StoreProductAnalytics';
import StoreProductPurchasePanel from '@/components/store/StoreProductPurchasePanel';
import PersonalizedProductPurchasePanel from '@/components/store/PersonalizedProductPurchasePanel';
import { buildStoreProductGalleryImages } from '@/lib/store/product-media';
import { productRequiresUnitUploads } from '@/lib/store/personalized-product';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildStoreProductJsonLd } from '@/lib/seo/structured-data';
import {
  buildOpenGraph,
  buildRobots,
  buildTwitterCard,
} from '@/lib/seo/metadata';
import {
  filterPublicStoreProducts,
  isPublicStoreProduct,
  isStoreLinkVisible,
  isStorePublic,
} from '@/lib/store/access';
import { createClient } from '@/lib/supabase/server';
import {
  getStoreProductBySlugFromDb,
  loadRelatedProducts,
} from '@/lib/store/load-catalog';
import { resolveStoreMonthlyKitBySlug, resolveStoreMonthlyKitBySlugForUser } from '@/lib/store/monthly-kits';
import { STORE_PRODUCTION_LEAD_TIME_LABEL } from '@/lib/store/production-lead-time';
import { STORE_ROUTES } from '@/lib/store/routes';
import {
  enrichStoreProductForSubscriber,
  enrichStoreProductsForSubscriber,
  formatSubscriberDiscountSummary,
} from '@/lib/store/subscriber-discount';
import { formatMoney } from '@/lib/dashboard/format';

interface Props {
  params: Promise<{ slug: string }>;
}

async function resolveStoreProductPage(
  admin: ReturnType<typeof createAdminClient>,
  slug: string
) {
  const monthlyKit = await resolveStoreMonthlyKitBySlug(admin, slug);
  if (monthlyKit) return monthlyKit;

  const dbProduct = await getStoreProductBySlugFromDb(admin, slug);
  if (dbProduct?.category === 'monthly-kit') return null;

  return dbProduct;
}

function productSpecs(product: {
  category: string;
  requiresSubscriptionBundle?: boolean;
}): string[] {
  const shipping =
    product.category === 'monthly-kit'
      ? product.requiresSubscriptionBundle
        ? 'Frete grátis na próxima caixa da assinatura'
        : 'Compra avulsa — frete calculado no checkout'
      : product.category === 'store-item'
        ? 'Frete calculado por região no checkout'
        : 'Assinantes: frete grátis na próxima caixa';
  return [
    'Produção sob demanda',
    STORE_PRODUCTION_LEAD_TIME_LABEL,
    'Sistema OpenLOCK compatível',
    'Escala 28mm',
    shipping,
  ];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const admin = createAdminClient();
  const product = await resolveStoreProductPage(admin, slug);

  if (!product) {
    return { title: 'Produto não encontrado' };
  }

  return {
    title: `${product.name} | Loja DungeonBox`,
    description: product.tagline,
    robots: buildRobots(isStoreLinkVisible()),
    openGraph: buildOpenGraph({
      title: product.name,
      description: product.tagline,
      path: `/loja/produto/${product.slug}`,
    }),
    twitter: buildTwitterCard({
      title: product.name,
      description: product.tagline,
    }),
  };
}

export default async function LojaProductPage({ params }: Props) {
  const { slug } = await params;
  const admin = createAdminClient();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const rawProduct =
    (await resolveStoreMonthlyKitBySlugForUser(
      admin,
      slug,
      user?.id,
      supabase
    )) ?? (await resolveStoreProductPage(admin, slug));

  if (!rawProduct) notFound();

  if (!isStorePublic() && !isPublicStoreProduct(rawProduct)) {
    notFound();
  }

  const product = await enrichStoreProductForSubscriber(
    supabase,
    user?.id,
    rawProduct
  );

  const related = filterPublicStoreProducts(
    await enrichStoreProductsForSubscriber(
      supabase,
      user?.id,
      await loadRelatedProducts(admin, rawProduct)
    )
  );
  const galleryImages = buildStoreProductGalleryImages(product);

  const jsonLd = buildStoreProductJsonLd({
    name: product.name,
    slug: product.slug,
    tagline: product.tagline,
    priceCents: product.priceCents,
    images: galleryImages,
  });

  return (
    <div className="mx-auto max-w-[75rem] px-4 pb-16 pt-6 sm:px-6 sm:pt-8 md:pb-24">
      <JsonLd data={jsonLd} />
      <StoreProductAnalytics product={product} />

      <nav
        className="home-v2-display mb-6 flex flex-wrap items-center gap-2 text-[11px] tracking-[0.2em] text-mesa-ash"
        aria-label="Breadcrumb"
      >
        <Link href={STORE_ROUTES.home} className="transition-colors hover:text-mesa-parchment">
          Loja
        </Link>
        {product.storeParentCategorySlug && product.storeParentCategoryName ? (
          <>
            <span aria-hidden="true">/</span>
            <Link
              href={STORE_ROUTES.category(product.storeParentCategorySlug)}
              className="transition-colors hover:text-mesa-parchment"
            >
              {product.storeParentCategoryName}
            </Link>
          </>
        ) : null}
        {product.storeCategoryName ? (
          <>
            <span aria-hidden="true">/</span>
            {product.storeCategorySlug ? (
              <Link
                href={STORE_ROUTES.category(product.storeCategorySlug)}
                className="transition-colors hover:text-mesa-parchment"
              >
                {product.storeCategoryName}
              </Link>
            ) : (
              <span>{product.storeCategoryName}</span>
            )}
          </>
        ) : null}
        <span aria-hidden="true">/</span>
        <span className="line-clamp-1 text-mesa-parchment" aria-current="page">
          {product.name}
        </span>
      </nav>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14">
        <ProductGallery name={product.name} images={galleryImages} />

        <div className="min-w-0 lg:sticky lg:top-28">
          {product.storeCategoryName ? (
            <p className="home-v2-display text-[11px] tracking-[0.28em] text-mesa-jade">
              {product.storeCategoryName}
            </p>
          ) : null}
          <h1 className="home-v2-display mt-3 text-balance text-[clamp(2.25rem,5vw,3.5rem)] leading-[0.92] text-mesa-parchment">
            {product.name}
          </h1>
          <p className="mt-4 text-pretty text-base leading-relaxed text-mesa-ash">{product.tagline}</p>

          <div className="mt-6">
            <PriceBadge
              priceCents={product.priceCents}
              priceLabel={product.priceLabel}
              originalPriceCents={product.originalPriceCents}
              featured={product.featured}
              subscriberDiscount={product.subscriberDiscount}
              subscriberDiscountPercent={product.subscriberDiscountAppliedPercent}
            />
          </div>

          {product.subscriberDiscount ? (
            <p className="mt-2 text-sm font-medium text-mesa-jade">
              {formatSubscriberDiscountSummary(
                product.subscriberDiscountAppliedPercent
              )}
            </p>
          ) : product.subscriberPriceCents != null &&
            product.subscriberPriceCents < product.priceCents ? (
            <p className="mt-2 text-sm font-medium text-mesa-jade">
              Assinantes: {formatMoney(product.subscriberPriceCents)}
            </p>
          ) : product.promoCode ? (
            <p className="mt-2 text-sm font-medium text-mesa-jade">
              Cupom {product.promoCode}
              {product.promoSummary ? ` — ${product.promoSummary}` : ''}
            </p>
          ) : null}

          <ul className="mt-6 grid grid-cols-1 gap-x-4 gap-y-2.5 border-y border-white/10 py-5 text-sm text-mesa-ash sm:grid-cols-2">
            {productSpecs(product).map((spec) => (
              <li key={spec} className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-mesa-jade" aria-hidden="true" />
                <span>{spec}</span>
              </li>
            ))}
          </ul>

          {productRequiresUnitUploads(product) ? (
            <PersonalizedProductPurchasePanel
              product={product}
              isLoggedIn={Boolean(user)}
            />
          ) : (
            <StoreProductPurchasePanel product={product} />
          )}
        </div>
      </div>

      <ProductTabs
        descriptionHtml={product.pageContentHtml}
        tagline={product.tagline}
      />

      <RelatedProducts products={related} />
    </div>
  );
}
