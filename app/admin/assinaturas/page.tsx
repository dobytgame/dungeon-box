import Link from 'next/link';
import AdminSearchForm from '@/components/admin/AdminSearchForm';
import AdminTable from '@/components/admin/AdminTable';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { requireAdmin } from '@/lib/admin/auth';
import { listAdminSubscriptions } from '@/lib/admin/queries';
import type { SubscriptionStatus } from '@/lib/dashboard/types';
import { formatDate } from '@/lib/dashboard/format';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'active', label: 'Ativa' },
  { value: 'pending', label: 'Pendente' },
  { value: 'paused', label: 'Pausada' },
  { value: 'past_due', label: 'Em atraso' },
  { value: 'cancelled', label: 'Cancelada' },
];

interface Props {
  searchParams: Promise<{ q?: string; status?: string }>;
}

export default async function AdminSubscriptionsPage({ searchParams }: Props) {
  const { admin } = await requireAdmin();
  const { q, status } = await searchParams;
  const subscriptions = await listAdminSubscriptions(admin, {
    q,
    status: status || undefined,
    limit: 100,
  });

  return (
    <div className="space-y-6">
      <AdminSearchForm
        defaultValue={q ?? ''}
        placeholder="ID Asaas, Stripe ou cupom"
      >
        <div>
          <label htmlFor="status" className="sr-only">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ''}
            className="rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </AdminSearchForm>

      <AdminTable
        rows={subscriptions}
        getRowHref={(row) => `/admin/assinaturas/${row.id}`}
        columns={[
          {
            key: 'customer',
            header: 'Cliente',
            cell: (row) => (
              <div>
                <p>{row.customerName ?? '—'}</p>
                <p className="text-xs text-stone-500">{row.customerEmail}</p>
              </div>
            ),
          },
          {
            key: 'plan',
            header: 'Plano',
            cell: (row) => row.planName ?? '—',
          },
          {
            key: 'status',
            header: 'Status',
            cell: (row) => (
              <StatusBadge
                kind="subscription"
                status={row.status as SubscriptionStatus}
              />
            ),
          },
          {
            key: 'cycle',
            header: 'Ciclo',
            cell: (row) =>
              row.current_cycle != null ? `#${row.current_cycle}` : '—',
          },
          {
            key: 'next',
            header: 'Próxima cobrança',
            cell: (row) => formatDate(row.next_billing_date),
          },
        ]}
      />

      <p className="text-xs text-stone-500">
        {subscriptions.length} registro(s).{' '}
        <Link href="/admin/assinaturas" className="text-console hover:underline">
          Limpar filtros
        </Link>
      </p>
    </div>
  );
}
