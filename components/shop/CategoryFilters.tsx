'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  STORE_PAGE_SIZE,
  STORE_SORT_OPTIONS,
  type StoreSortOption,
} from '@/lib/store/sort';

interface Props {
  categorySlug: string;
  total: number;
  currentPage: number;
}

export default function CategoryFilters({
  categorySlug,
  total,
  currentPage,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSort = (searchParams.get('ordenar') ?? 'novidades') as StoreSortOption;
  const totalPages = Math.max(1, Math.ceil(total / STORE_PAGE_SIZE));

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
    <div className="mb-8 flex flex-col gap-4 border-b border-white/[0.06] pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-xs uppercase tracking-widest text-stone-500">
          Ordenar
        </span>
        {STORE_SORT_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => updateParams({ ordenar: option.value, pagina: '1' })}
            className={`cursor-pointer rounded-sm px-3 py-1.5 font-display text-[10px] uppercase tracking-widest transition ${
              currentSort === option.value
                ? 'bg-ember/15 text-ember'
                : 'border border-white/10 text-stone-400 hover:border-white/20'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-stone-500">
        {total} {total === 1 ? 'produto' : 'produtos'}
      </p>

      {totalPages > 1 ? (
        <nav className="flex items-center gap-2" aria-label="Paginação">
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => updateParams({ pagina: String(currentPage - 1) })}
            className="cursor-pointer rounded-sm border border-white/10 px-3 py-1.5 text-xs text-stone-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-xs text-stone-500">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => updateParams({ pagina: String(currentPage + 1) })}
            className="cursor-pointer rounded-sm border border-white/10 px-3 py-1.5 text-xs text-stone-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Próxima
          </button>
        </nav>
      ) : null}
    </div>
  );
}
