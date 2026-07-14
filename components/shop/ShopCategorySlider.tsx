import ShopCategoryMediaCard from '@/components/shop/ShopCategoryMediaCard';
import type { StoreCategory } from '@/lib/store/load-catalog';

interface Props {
  categories: StoreCategory[];
}

const HOMEPAGE_CATEGORY_EXCLUDED_SLUGS = new Set(['kits-mes']);

export default function ShopCategorySlider({ categories }: Props) {
  const visibleCategories = categories.filter(
    (category) => !HOMEPAGE_CATEGORY_EXCLUDED_SLUGS.has(category.slug)
  );

  if (visibleCategories.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <p className="font-display text-xs uppercase tracking-[0.25em] text-stone-500">
          Navegue por
        </p>
        <h2 className="mt-2 font-display text-2xl uppercase tracking-wide text-white sm:text-3xl">
          Categorias
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
        {visibleCategories.map((category) => (
          <ShopCategoryMediaCard key={category.slug} category={category} className="w-full" />
        ))}
      </div>
    </section>
  );
}
