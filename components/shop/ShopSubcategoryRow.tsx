import ShopCategoryMediaCard from '@/components/shop/ShopCategoryMediaCard';
import type { StoreCategory } from '@/lib/store/load-catalog';
import { STORE_ROUTES } from '@/lib/store/routes';
import Link from 'next/link';

interface Props {
  parentCategory: StoreCategory;
  subcategories: StoreCategory[];
  activeSlug: string;
}

export default function ShopSubcategoryRow({
  parentCategory,
  subcategories,
  activeSlug,
}: Props) {
  if (subcategories.length === 0) return null;

  const hasMedia = subcategories.some(
    (category) => category.thumbUrl || category.bannerUrl
  );

  if (hasMedia) {
    return (
      <nav
        className="mb-8"
        aria-label={`Subcategorias de ${parentCategory.name}`}
      >
        <div className="mb-4 flex flex-wrap gap-2">
          <Link
            href={STORE_ROUTES.category(parentCategory.slug)}
            className={`flex min-h-10 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-colors duration-200 ${
              activeSlug === parentCategory.slug
                ? 'border-mesa-parchment bg-mesa-parchment text-mesa-ink'
                : 'border-white/10 text-mesa-ash hover:border-white/25 hover:text-mesa-parchment'
            }`}
          >
            Todas
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {subcategories.map((subcategory) => (
            <ShopCategoryMediaCard
              key={subcategory.slug}
              category={subcategory}
              className={
                activeSlug === subcategory.slug
                  ? 'ring-2 ring-mesa-ember/60 ring-offset-2 ring-offset-mesa-ink'
                  : ''
              }
            />
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav
      className="mb-8 flex flex-wrap gap-2"
      aria-label={`Subcategorias de ${parentCategory.name}`}
    >
      <Link
        href={STORE_ROUTES.category(parentCategory.slug)}
        className={`flex min-h-10 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-colors duration-200 ${
          activeSlug === parentCategory.slug
            ? 'border-mesa-parchment bg-mesa-parchment text-mesa-ink'
            : 'border-white/10 text-mesa-ash hover:border-white/25 hover:text-mesa-parchment'
        }`}
      >
        Todas
      </Link>
      {subcategories.map((subcategory) => (
        <Link
          key={subcategory.slug}
          href={STORE_ROUTES.category(subcategory.slug)}
          className={`flex min-h-10 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-colors duration-200 ${
            activeSlug === subcategory.slug
              ? 'border-mesa-parchment bg-mesa-parchment text-mesa-ink'
              : 'border-white/10 text-mesa-ash hover:border-white/25 hover:text-mesa-parchment'
          }`}
        >
          {subcategory.name}
        </Link>
      ))}
    </nav>
  );
}
