'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { StoreCategory } from '@/lib/store/load-catalog';
import {
  STORE_PAGE_SIZE,
  STORE_SORT_OPTIONS,
  type StoreSortOption,
} from '@/lib/store/sort';
import { STORE_ROUTES } from '@/lib/store/routes';

interface BreadcrumbItem {
  href?: string;
  label: string;
}

interface Props {
  parentCategory: StoreCategory;
  subcategories: StoreCategory[];
  activeSlug: string;
  breadcrumb: BreadcrumbItem[];
  total: number;
  currentPage: number;
}

const subcategoryLinkClass = (active: boolean) =>
  `shrink-0 rounded-sm border px-3 py-1.5 font-display text-xs uppercase tracking-wider transition ${
    active
      ? 'border-ember/40 bg-ember/15 text-ember'
      : 'border-white/10 text-stone-400 hover:border-white/20 hover:text-white'
  }`;

export default function CategoryListingToolbar({
  parentCategory,
  subcategories,
  activeSlug,
  breadcrumb,
  total,
  currentPage,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = (searchParams.get('ordenar') ?? 'novidades') as StoreSortOption;
  const totalPages = Math.max(1, Math.ceil(total / STORE_PAGE_SIZE));
  const hasSubcategories = subcategories.length > 0;

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="mb-6 border-b border-white/[0.06] pb-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 lg:flex-nowrap">
        <nav
          className="flex shrink-0 items-center gap-1.5 text-xs uppercase tracking-widest text-stone-500"
          aria-label="Breadcrumb"
        >
          {breadcrumb.map((item, index) => (
            <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {item.href ? (
                <Link href={item.href} className="hover:text-ember">
                  {item.label}
                </Link>
              ) : (
                <span className="text-stone-400">{item.label}</span>
              )}
            </span>
          ))}
        </nav>

        {hasSubcategories ? (
          <>
            <span
              className="hidden h-4 w-px shrink-0 bg-white/10 lg:block"
              aria-hidden="true"
            />
            <nav
              className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 lg:pb-0"
              aria-label={`Subcategorias de ${parentCategory.name}`}
            >
              <Link
                href={STORE_ROUTES.category(parentCategory.slug)}
                className={subcategoryLinkClass(activeSlug === parentCategory.slug)}
              >
                Todas
              </Link>
              {subcategories.map((subcategory) => (
                <Link
                  key={subcategory.slug}
                  href={STORE_ROUTES.category(subcategory.slug)}
                  className={subcategoryLinkClass(activeSlug === subcategory.slug)}
                >
                  {subcategory.name}
                </Link>
              ))}
            </nav>
          </>
        ) : null}

        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto lg:ml-auto">
          <div className="flex items-center gap-1.5">
            {STORE_SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateParams({ ordenar: option.value, pagina: '1' })}
                className={`cursor-pointer whitespace-nowrap rounded-sm px-3 py-1.5 font-display text-xs uppercase tracking-wider transition ${
                  currentSort === option.value
                    ? 'bg-ember/15 text-ember'
                    : 'border border-white/10 text-stone-400 hover:border-white/20'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <span className="hidden h-4 w-px bg-white/10 sm:block" aria-hidden="true" />

          <p className="whitespace-nowrap text-sm text-stone-500">
            {total} {total === 1 ? 'produto' : 'produtos'}
          </p>

          {totalPages > 1 ? (
            <nav className="flex items-center gap-1.5" aria-label="Paginação">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => updateParams({ pagina: String(currentPage - 1) })}
                className="cursor-pointer rounded-sm border border-white/10 px-2.5 py-1.5 text-xs uppercase tracking-wider text-stone-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Ant.
              </button>
              <span className="text-xs text-stone-500">
                {currentPage}/{totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => updateParams({ pagina: String(currentPage + 1) })}
                className="cursor-pointer rounded-sm border border-white/10 px-2.5 py-1.5 text-xs uppercase tracking-wider text-stone-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Próx.
              </button>
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}
