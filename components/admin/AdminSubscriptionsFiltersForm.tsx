import AdminListSortFields from '@/components/admin/AdminListSortFields';
import type { AdminSubscriptionSortField } from '@/lib/admin/types';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'active', label: 'Ativa' },
  { value: 'pending', label: 'Pendente' },
  { value: 'paused', label: 'Pausada' },
  { value: 'past_due', label: 'Em atraso' },
  { value: 'cancelled', label: 'Cancelada' },
] as const;

const SORT_OPTIONS: { value: AdminSubscriptionSortField; label: string }[] = [
  { value: 'created_at', label: 'Data de cadastro' },
  { value: 'started_at', label: 'Data de início' },
  { value: 'next_billing_date', label: 'Próxima cobrança' },
  { value: 'cancelled_at', label: 'Data de cancelamento' },
  { value: 'current_cycle', label: 'Ciclo atual' },
];

interface Props {
  values: {
    q?: string;
    status?: string;
    sort: AdminSubscriptionSortField;
    order: 'asc' | 'desc';
    pageSize: number;
  };
}

export default function AdminSubscriptionsFiltersForm({ values }: Props) {
  return (
    <form
      className="admin-panel grid gap-3 rounded p-4 md:grid-cols-2 xl:grid-cols-4"
      method="get"
    >
      <div className="md:col-span-2 xl:col-span-4">
        <label
          htmlFor="subs-q"
          className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500"
        >
          Buscar
        </label>
        <input
          id="subs-q"
          name="q"
          defaultValue={values.q ?? ''}
          placeholder="ID Asaas, Stripe ou cupom"
          className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-console/40 focus:outline-none focus:ring-1 focus:ring-console/30"
        />
      </div>

      <div>
        <label
          htmlFor="subs-status"
          className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-zinc-500"
        >
          Status
        </label>
        <select
          id="subs-status"
          name="status"
          defaultValue={values.status ?? ''}
          className="w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <AdminListSortFields
        sort={values.sort}
        order={values.order}
        pageSize={values.pageSize}
        sortOptions={SORT_OPTIONS}
        sortId="subs-sort"
        orderId="subs-order"
        pageSizeId="subs-page-size"
      />

      <div className="flex items-end gap-2 md:col-span-2 xl:col-span-4">
        <button
          type="submit"
          className="cursor-pointer rounded border border-console/30 bg-console/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-console transition hover:bg-console/15"
        >
          Aplicar filtros
        </button>
        <a
          href="/admin/assinaturas"
          className="rounded border border-white/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
        >
          Limpar
        </a>
      </div>
    </form>
  );
}
