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
            className={`rounded-sm border px-3 py-2 text-sm font-semibold transition ${
              activeSlug === parentCategory.slug
                ? 'border-ember/40 bg-ember/15 text-ember'
                : 'border-white/10 text-stone-400 hover:border-white/20 hover:text-white'
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
                  ? 'ring-2 ring-ember/50 ring-offset-2 ring-offset-[#0A0C10]'
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
        className={`rounded-sm border px-3 py-2 text-sm font-semibold transition ${
          activeSlug === parentCategory.slug
            ? 'border-ember/40 bg-ember/15 text-ember'
            : 'border-white/10 text-stone-400 hover:border-white/20 hover:text-white'
        }`}
      >
        Todas
      </Link>
      {subcategories.map((subcategory) => (
        <Link
          key={subcategory.slug}
          href={STORE_ROUTES.category(subcategory.slug)}
          className={`rounded-sm border px-3 py-2 text-sm font-semibold transition ${
            activeSlug === subcategory.slug
              ? 'border-ember/40 bg-ember/15 text-ember'
              : 'border-white/10 text-stone-400 hover:border-white/20 hover:text-white'
          }`}
        >
          {subcategory.name}
        </Link>
      ))}
    </nav>
  );
}
