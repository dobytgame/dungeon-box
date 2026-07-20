import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import JsonLd from '@/components/seo/JsonLd';
import PriceBadge from '@/components/shop/PriceBadge';
import ProductGallery from '@/components/shop/ProductGallery';
import ProductTabs from '@/components/shop/ProductTabs';
import RelatedProducts from '@/components/shop/RelatedProducts';
import StoreProductAnalytics from '@/components/store/StoreProductAnalytics';
import StoreProductPurchasePanel from '@/components/store/StoreProductPurchasePanel';
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
  SUBSCRIBER_STORE_DISCOUNT_SUMMARY,
} from '@/lib/store/subscriber-discount';

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
  const galleryImages = [
    ...(product.imageUrl ? [product.imageUrl] : []),
    ...(product.galleryUrls ?? []),
  ].filter((url, index, list) => list.indexOf(url) === index);

  const jsonLd = buildStoreProductJsonLd({
    name: product.name,
    slug: product.slug,
    tagline: product.tagline,
    priceCents: product.priceCents,
    imageUrl: product.imageUrl,
    galleryUrls: product.galleryUrls,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <JsonLd data={jsonLd} />
      <StoreProductAnalytics product={product} />

      <nav
        className="mb-6 flex flex-wrap items-center gap-2 text-xs uppercase tracking-widest text-stone-500"
        aria-label="Breadcrumb"
      >
        <Link href={STORE_ROUTES.home} className="hover:text-ember">
          Loja
        </Link>
        {product.storeParentCategorySlug && product.storeParentCategoryName ? (
          <>
            <span aria-hidden="true">/</span>
            <Link
              href={STORE_ROUTES.category(product.storeParentCategorySlug)}
              className="hover:text-ember"
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
                className="hover:text-ember"
              >
                {product.storeCategoryName}
              </Link>
            ) : (
              <span>{product.storeCategoryName}</span>
            )}
          </>
        ) : null}
        <span aria-hidden="true">/</span>
        <span className="text-stone-400">{product.name}</span>
      </nav>

      <div className="grid items-start gap-10 lg:grid-cols-2">
        <ProductGallery name={product.name} images={galleryImages} />

        <div className="min-w-0">
          {product.storeCategoryName ? (
            <p className="font-display text-xs uppercase tracking-[0.2em] text-stone-500">
              {product.storeCategoryName}
            </p>
          ) : null}
          <h1 className="mt-2 font-display text-3xl uppercase tracking-wide text-white">
            {product.name}
          </h1>
          <p className="mt-3 text-sm text-stone-400">{product.tagline}</p>

          <div className="mt-4">
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
            <p className="mt-2 text-xs text-gold/80">
              {product.subscriberDiscountAppliedPercent
                ? formatSubscriberDiscountSummary(
                    product.subscriberDiscountAppliedPercent
                  )
                : SUBSCRIBER_STORE_DISCOUNT_SUMMARY}
            </p>
          ) : product.promoCode ? (
            <p className="mt-2 text-xs text-ember/80">
              Cupom {product.promoCode}
              {product.promoSummary ? ` — ${product.promoSummary}` : ''}
            </p>
          ) : null}

          <ul className="mt-6 space-y-2 border-t border-white/[0.06] pt-6 text-sm text-stone-400">
            <li>✓ Produção sob demanda</li>
            <li>✓ {STORE_PRODUCTION_LEAD_TIME_LABEL}</li>
            <li>✓ Sistema OpenLOCK compatível</li>
            <li>✓ Escala 28mm</li>
            {product.category === 'monthly-kit' ? (
              <li>
                {product.requiresSubscriptionBundle
                  ? '✓ Frete grátis na próxima caixa da assinatura'
                  : '✓ Compra avulsa — frete calculado no checkout'}
              </li>
            ) : product.category === 'store-item' ? (
              <li>✓ Frete calculado por região no checkout</li>
            ) : (
              <li>✓ Assinantes: frete grátis na próxima caixa</li>
            )}
          </ul>

          <StoreProductPurchasePanel product={product} />
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
