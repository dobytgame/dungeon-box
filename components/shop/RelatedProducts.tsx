import ShopProductGrid from '@/components/shop/ShopProductGrid';
import type { StoreProduct } from '@/lib/store/catalog';

interface Props {
  products: StoreProduct[];
}

export default function RelatedProducts({ products }: Props) {
  if (products.length === 0) return null;

  return (
    <div className="mt-16 border-t border-white/[0.06] pt-12">
      <ShopProductGrid
        eyebrow="Você também pode gostar"
        title="Produtos relacionados"
        products={products}
        variant="compact"
      />
    </div>
  );
}
