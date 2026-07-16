import Link from 'next/link';
import AdminSearchForm from '@/components/admin/AdminSearchForm';
import AdminTable from '@/components/admin/AdminTable';
import ComboBadge from '@/components/admin/ComboBadge';
import SyncAsaasButton from '@/components/admin/SyncAsaasButton';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { requireAdmin } from '@/lib/admin/auth';
import { listAdminSubscriptions } from '@/lib/admin/queries';
import {
  reconcileAllPendingAsaasSubscriptions,
  reconcilePendingAsaasSubscriptions,
} from '@/lib/asaas/reconcile-pending';
import type { BillingTerm } from '@/lib/checkout/combo-billing';
import { isComboTerm } from '@/lib/checkout/combo-billing';
import type { SubscriptionStatus } from '@/lib/dashboard/types';
import { formatDate, formatMoney } from '@/lib/dashboard/format';

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
  let subscriptions = await listAdminSubscriptions(admin, {
    q,
    status: status || undefined,
    limit: 100,
  });

  if (status === 'pending') {
    await reconcileAllPendingAsaasSubscriptions(admin);
  } else if (subscriptions.some((row) => row.status === 'pending')) {
    await reconcilePendingAsaasSubscriptions(
      admin,
      subscriptions.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        status: row.status,
        asaas_subscription_id: row.asaas_subscription_id,
        asaas_customer_id: row.asaas_customer_id,
        billing_term: row.billingTerm,
      }))
    );
  }

  if (status === 'pending' || subscriptions.some((row) => row.status === 'pending')) {
    subscriptions = await listAdminSubscriptions(admin, {
      q,
      status: status || undefined,
      limit: 100,
    });
  }

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
            cell: (row) => (
              <div className="flex flex-wrap items-center gap-2">
                <span>{row.planName ?? '—'}</span>
                {row.billingTerm && isComboTerm(row.billingTerm as BillingTerm) ? (
                  <ComboBadge term={row.billingTerm as BillingTerm} compact />
                ) : null}
              </div>
            ),
          },
          {
            key: 'combo',
            header: 'Combo',
            cell: (row) =>
              row.comboTotalCents != null && row.comboTotalCents > 0 ? (
                <div>
                  <p className="font-mono text-sm tabular-nums">
                    {formatMoney(row.comboTotalCents)}
                  </p>
                  {row.comboInstallments != null && row.comboInstallments > 1 ? (
                    <p className="text-xs text-stone-500">
                      {row.comboInstallments}x no cartão
                    </p>
                  ) : null}
                </div>
              ) : (
                '—'
              ),
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
          {
            key: 'cancel_reason',
            header: 'Motivo cancelamento',
            cell: (row) =>
              row.cancel_reason ? (
                <p className="max-w-xs text-sm text-stone-400" title={row.cancel_reason}>
                  {row.cancel_reason}
                </p>
              ) : (
                '—'
              ),
          },
          {
            key: 'asaas',
            header: 'Asaas',
            cell: (row) =>
              row.asaas_subscription_id || row.asaas_customer_id ? (
                <SyncAsaasButton subscriptionId={row.id} compact />
              ) : (
                <span className="font-mono text-[10px] text-zinc-600">—</span>
              ),
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
