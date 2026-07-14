import Link from 'next/link';
import StoreProductCard from '@/components/store/StoreProductCard';
import StoreProductFeatureCard from '@/components/store/StoreProductFeatureCard';
import type { StoreProduct } from '@/lib/store/catalog';
import { STORE_ROUTES } from '@/lib/store/routes';

interface Props {
  title?: string;
  eyebrow?: string;
  products: StoreProduct[];
  viewAllHref?: string;
  /** Cards compactos para listagens densas (categorias, relacionados). */
  variant?: 'full' | 'compact';
  /** Sem section wrapper nem padding vertical (uso em páginas de categoria). */
  embedded?: boolean;
}

export default function ShopProductGrid({
  title,
  eyebrow,
  products,
  viewAllHref,
  variant = 'full',
  embedded = false,
}: Props) {
  if (products.length === 0) return null;

  const showHeader = Boolean(title || eyebrow || viewAllHref);

  const grid = (
    <div
      className={
        variant === 'compact'
          ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          : 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      }
    >
      {products.map((product) =>
        variant === 'compact' ? (
          <StoreProductFeatureCard key={product.id} product={product} />
        ) : (
          <StoreProductCard key={product.id} product={product} />
        )
      )}
    </div>
  );

  if (embedded) return grid;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {showHeader ? (
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow ? (
            <p className="font-display text-xs uppercase tracking-[0.25em] text-stone-500">
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <h2 className="mt-2 font-display text-2xl uppercase tracking-wide text-white sm:text-3xl">
              {title}
            </h2>
          ) : null}
        </div>
        {viewAllHref ? (
          <Link
            href={viewAllHref}
            className="font-display text-xs uppercase tracking-widest text-ember hover:text-ember-bright"
          >
            Ver todos →
          </Link>
        ) : null}
      </div>
      ) : null}

      {grid}
    </section>
  );
}
