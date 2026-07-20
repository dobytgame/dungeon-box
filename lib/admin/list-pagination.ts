export type AdminListSortOrder = 'asc' | 'desc';

export const ADMIN_LIST_DEFAULT_PAGE_SIZE = 25;
export const ADMIN_LIST_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export type AdminPaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdminListPaginationParams = {
  page: number;
  pageSize: number;
  sort: string;
  order: AdminListSortOrder;
};

function parsePositiveInt(
  raw: string | undefined,
  fallback: number,
  { min = 1, max }: { min?: number; max?: number } = {}
): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  const clamped = Math.max(min, parsed);
  return max != null ? Math.min(clamped, max) : clamped;
}

export function parseAdminListPagination(
  searchParams: Record<string, string | undefined>,
  options: {
    defaultSort: string;
    defaultOrder?: AdminListSortOrder;
    allowedSorts: readonly string[];
    defaultPageSize?: number;
  }
): AdminListPaginationParams {
  const pageSize = parsePositiveInt(
    searchParams.pageSize,
    options.defaultPageSize ?? ADMIN_LIST_DEFAULT_PAGE_SIZE,
    { min: 1, max: 100 }
  );

  const page = parsePositiveInt(searchParams.page, 1, { min: 1 });

  const sortRaw = searchParams.sort?.trim();
  const sort =
    sortRaw && options.allowedSorts.includes(sortRaw)
      ? sortRaw
      : options.defaultSort;

  const orderRaw = searchParams.order?.trim();
  const order: AdminListSortOrder =
    orderRaw === 'asc' || orderRaw === 'desc'
      ? orderRaw
      : (options.defaultOrder ?? 'desc');

  return { page, pageSize, sort, order };
}

export function paginateList<T>(
  items: T[],
  page: number,
  pageSize: number
): AdminPaginatedResult<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export function buildAdminListSearchParams(
  current: Record<string, string | undefined>,
  updates: Record<string, string | number | null | undefined>
): Record<string, string> {
  const next: Record<string, string> = {};

  for (const [key, value] of Object.entries(current)) {
    if (value != null && value !== '') {
      next[key] = value;
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value == null || value === '') {
      delete next[key];
    } else {
      next[key] = String(value);
    }
  }

  return next;
}

export function adminListQueryString(
  params: Record<string, string | undefined>
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && value !== '') {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
