import ShopCategoryMediaCard from '@/components/shop/ShopCategoryMediaCard';
import ShopSection from '@/components/shop/ShopSection';
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
    <ShopSection titleId="loja-categorias-title" eyebrow="Navegue por" title="Categorias" tone="stone">
      <ul className="home-v2-snap -mx-4 flex scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
        {visibleCategories.map((category, index) => (
          <li
            key={category.slug}
            className="home-v2-reveal w-[82%] shrink-0 sm:w-auto"
            style={{ '--stagger': index } as React.CSSProperties}
          >
            <ShopCategoryMediaCard category={category} index={index} />
          </li>
        ))}
      </ul>
    </ShopSection>
  );
}
