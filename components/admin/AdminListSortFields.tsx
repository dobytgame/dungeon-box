import { ADMIN_LIST_PAGE_SIZE_OPTIONS } from '@/lib/admin/list-pagination';

const ORDER_OPTIONS = [
  { value: 'desc', label: 'Mais recente primeiro' },
  { value: 'asc', label: 'Mais antigo primeiro' },
] as const;

const selectClass =
  'w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white';

const labelClass =
  'mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500';

interface SortFieldOption {
  value: string;
  label: string;
}

interface Props {
  sort: string;
  order: 'asc' | 'desc';
  pageSize: number;
  sortOptions: readonly SortFieldOption[];
  sortId?: string;
  orderId?: string;
  pageSizeId?: string;
}

export default function AdminListSortFields({
  sort,
  order,
  pageSize,
  sortOptions,
  sortId = 'list-sort',
  orderId = 'list-order',
  pageSizeId = 'list-page-size',
}: Props) {
  return (
    <>
      <input type="hidden" name="page" value="1" />

      <div>
        <label htmlFor={sortId} className={labelClass}>
          Ordenar por
        </label>
        <select
          id={sortId}
          name="sort"
          defaultValue={sort}
          className={selectClass}
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={orderId} className={labelClass}>
          Ordem
        </label>
        <select
          id={orderId}
          name="order"
          defaultValue={order}
          className={selectClass}
        >
          {ORDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={pageSizeId} className={labelClass}>
          Por página
        </label>
        <select
          id={pageSizeId}
          name="pageSize"
          defaultValue={String(pageSize)}
          className={selectClass}
        >
          {ADMIN_LIST_PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
