import ShopSection from '@/components/shop/ShopSection';
import StoreProductCard from '@/components/store/StoreProductCard';
import StoreProductFeatureCard from '@/components/store/StoreProductFeatureCard';
import type { StoreProduct } from '@/lib/store/catalog';

interface Props {
  title?: string;
  eyebrow?: string;
  support?: string;
  products: StoreProduct[];
  viewAllHref?: string;
  /** Cards compactos para listagens densas (categorias, relacionados). */
  variant?: 'full' | 'compact';
  /** Sem section wrapper nem padding vertical (uso em páginas de categoria). */
  embedded?: boolean;
  id?: string;
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function ShopProductList({
  products,
  variant = 'full',
}: Pick<Props, 'products' | 'variant'>) {
  return (
    <ul
      className={
        variant === 'compact'
          ? 'grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4'
          : 'grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3'
      }
    >
      {products.map((product, index) => (
        <li
          key={product.id}
          className="home-v2-reveal flex"
          style={{ '--stagger': index % (variant === 'compact' ? 4 : 3) } as React.CSSProperties}
        >
          {variant === 'compact' ? (
            <StoreProductFeatureCard product={product} />
          ) : (
            <StoreProductCard product={product} />
          )}
        </li>
      ))}
    </ul>
  );
}

export default function ShopProductGrid({
  title,
  eyebrow,
  support,
  products,
  viewAllHref,
  variant = 'full',
  embedded = false,
  id,
}: Props) {
  if (products.length === 0) return null;

  const list = <ShopProductList products={products} variant={variant} />;

  if (embedded || !title) return list;

  return (
    <ShopSection
      id={id}
      titleId={`loja-${slugify(title)}`}
      eyebrow={eyebrow}
      title={title}
      support={support}
      viewAll={viewAllHref ? { href: viewAllHref } : undefined}
    >
      {list}
    </ShopSection>
  );
}
