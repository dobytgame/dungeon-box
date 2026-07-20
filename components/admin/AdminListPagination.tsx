import Link from 'next/link';
import {
  adminListQueryString,
  buildAdminListSearchParams,
  type AdminPaginatedResult,
} from '@/lib/admin/list-pagination';

interface Props {
  basePath: string;
  result: Pick<AdminPaginatedResult<unknown>, 'page' | 'pageSize' | 'total' | 'totalPages'>;
  searchParams: Record<string, string | undefined>;
  noun?: string;
}

function pageHref(
  basePath: string,
  searchParams: Record<string, string | undefined>,
  page: number
): string {
  const params = buildAdminListSearchParams(searchParams, { page });
  return `${basePath}${adminListQueryString(params)}`;
}

export default function AdminListPagination({
  basePath,
  result,
  searchParams,
  noun = 'registro',
}: Props) {
  const { page, pageSize, total, totalPages } = result;
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const prevPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  return (
    <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-mono text-[11px] text-zinc-500">
        {start}–{end} de {total} {noun}
        {total !== 1 ? 's' : ''}
        {totalPages > 1 ? ` · página ${page} de ${totalPages}` : ''}
      </p>

      {totalPages > 1 ? (
        <nav
          className="flex flex-wrap items-center gap-2"
          aria-label="Paginação"
        >
          {page > 1 ? (
            <Link
              href={pageHref(basePath, searchParams, prevPage)}
              className="rounded border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
            >
              ← Anterior
            </Link>
          ) : (
            <span className="rounded border border-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-700">
              ← Anterior
            </span>
          )}

          {page < totalPages ? (
            <Link
              href={pageHref(basePath, searchParams, nextPage)}
              className="rounded border border-white/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
            >
              Próxima →
            </Link>
          ) : (
            <span className="rounded border border-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-700">
              Próxima →
            </span>
          )}
        </nav>
      ) : null}
    </div>
  );
}
