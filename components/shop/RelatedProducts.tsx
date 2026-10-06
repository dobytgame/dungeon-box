import HomeV2SectionHeading from '@/components/home-v2/HomeV2SectionHeading';
import { ShopProductList } from '@/components/shop/ShopProductGrid';
import type { StoreProduct } from '@/lib/store/catalog';

interface Props {
  products: StoreProduct[];
}

export default function RelatedProducts({ products }: Props) {
  if (products.length === 0) return null;

  return (
    <section className="mt-16 border-t border-white/10 pt-12 md:mt-20" aria-labelledby="produto-relacionados-title">
      <HomeV2SectionHeading
        eyebrow="Você também pode gostar"
        title="Produtos relacionados"
        titleId="produto-relacionados-title"
        size="md"
      />
      <div className="mt-10">
        <ShopProductList products={products} variant="compact" />
      </div>
    </section>
  );
}
