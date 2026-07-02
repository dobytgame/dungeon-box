import Link from 'next/link';
import { notFound } from 'next/navigation';
import StoreSubNav from '@/components/store/StoreSubNav';
import StoreProductPurchasePanel from '@/components/store/StoreProductPurchasePanel';
import { requireDashboardUser } from '@/lib/dashboard/queries';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStoreProductBySlugFromDb } from '@/lib/store/load-catalog';
import { formatMoney } from '@/lib/dashboard/format';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function StoreProductPage({ params }: Props) {
  const { slug } = await params;
  await requireDashboardUser();
  const admin = createAdminClient();
  const product = await getStoreProductBySlugFromDb(admin, slug);

  if (!product) notFound();

  const gallery = product.galleryUrls ?? [];

  return (
    <div>
      <StoreSubNav />

      <Link
        href="/dashboard/loja"
        className="mb-6 inline-block text-xs uppercase tracking-widest text-stone-500 hover:text-ember"
      >
        ← Voltar para loja
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-sm border border-white/[0.06] bg-stone-950/50">
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.name}
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-stone-900/40 text-sm text-stone-600">
                Sem imagem
              </div>
            )}
          </div>

          {gallery.length > 0 ? (
            <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {gallery.map((url) => (
                <li
                  key={url}
                  className="overflow-hidden rounded-sm border border-white/[0.06]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="aspect-square w-full object-cover" />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div>
          {product.storeCategoryName ? (
            <p className="font-display text-xs uppercase tracking-[0.2em] text-stone-500">
              {product.storeCategoryName}
            </p>
          ) : null}
          <h1 className="mt-2 font-display text-3xl uppercase tracking-wide text-white">
            {product.name}
          </h1>
          <p className="mt-3 text-sm text-stone-400">{product.tagline}</p>
          <p className="mt-4 font-display text-3xl text-gold">
            {product.priceLabel}
          </p>
          {product.originalPriceCents &&
          product.originalPriceCents > product.priceCents ? (
            <p className="mt-1 text-sm text-stone-500 line-through">
              {formatMoney(product.originalPriceCents)}
            </p>
          ) : null}

          <StoreProductPurchasePanel product={product} />

          {product.pageContentHtml ? (
            <section className="prose prose-invert mt-10 max-w-none border-t border-white/[0.06] pt-8 prose-headings:font-display prose-headings:uppercase prose-a:text-ember">
              <div dangerouslySetInnerHTML={{ __html: product.pageContentHtml }} />
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
