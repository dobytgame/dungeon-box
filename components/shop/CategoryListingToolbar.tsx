'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  `flex min-h-11 shrink-0 snap-start cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-colors duration-200 ${
    active
      ? 'border-mesa-parchment bg-mesa-parchment text-mesa-ink'
      : 'border-white/10 text-mesa-ash hover:border-white/25 hover:text-mesa-parchment'
  }`;

const pagerButtonClass =
  'flex size-10 cursor-pointer items-center justify-center rounded-sm border border-white/15 text-mesa-parchment transition-colors hover:border-white/35 disabled:cursor-not-allowed disabled:opacity-40';

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
    <div className="mb-8 border-b border-white/10 pb-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-3">
        <nav
          className="home-v2-display flex shrink-0 items-center gap-1.5 text-[11px] tracking-[0.2em] text-mesa-ash"
          aria-label="Breadcrumb"
        >
          {breadcrumb.map((item, index) => (
            <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {item.href ? (
                <Link href={item.href} className="transition-colors hover:text-mesa-parchment">
                  {item.label}
                </Link>
              ) : (
                <span className="text-mesa-parchment" aria-current="page">{item.label}</span>
              )}
            </span>
          ))}
        </nav>

        {hasSubcategories ? (
          <>
            <span
              className="hidden h-5 w-px shrink-0 bg-white/10 lg:block"
              aria-hidden="true"
            />
            <nav
              className="-mx-4 flex min-w-0 flex-1 snap-x scroll-px-4 items-center gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden"
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

        <div className="flex w-full shrink-0 flex-wrap items-center gap-3 lg:ml-auto lg:w-auto">
          <div className="flex w-full items-center rounded-sm border border-white/10 bg-mesa-stone p-1 sm:w-auto" role="group" aria-label="Ordenar produtos">
            {STORE_SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => updateParams({ ordenar: option.value, pagina: '1' })}
                aria-pressed={currentSort === option.value}
                className={`min-h-10 flex-1 cursor-pointer whitespace-nowrap rounded-sm px-3 sm:flex-none text-[13px] font-medium transition-colors duration-200 ${
                  currentSort === option.value
                    ? 'bg-mesa-parchment text-mesa-ink'
                    : 'text-mesa-ash hover:text-mesa-parchment'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <span className="hidden h-5 w-px bg-white/10 sm:block" aria-hidden="true" />

          <p className="whitespace-nowrap text-sm tabular-nums text-mesa-ash">
            {total} {total === 1 ? 'produto' : 'produtos'}
          </p>

          {totalPages > 1 ? (
            <nav className="flex items-center gap-1.5" aria-label="Paginação">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => updateParams({ pagina: String(currentPage - 1) })}
                className={pagerButtonClass}
                aria-label="Página anterior"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <span className="text-sm tabular-nums text-mesa-ash">
                {currentPage}/{totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => updateParams({ pagina: String(currentPage + 1) })}
                className={pagerButtonClass}
                aria-label="Próxima página"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}
