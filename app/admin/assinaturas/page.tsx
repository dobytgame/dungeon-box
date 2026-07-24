import Link from 'next/link';
import AdminListPagination from '@/components/admin/AdminListPagination';
import AdminSubscriptionsFiltersForm from '@/components/admin/AdminSubscriptionsFiltersForm';
import AdminTable from '@/components/admin/AdminTable';
import ComboBadge from '@/components/admin/ComboBadge';
import PlanUpgradeBadge from '@/components/admin/PlanUpgradeBadge';
import RepairPlanUpgradeAsaasButton from '@/components/admin/RepairPlanUpgradeAsaasButton';
import SyncAsaasButton from '@/components/admin/SyncAsaasButton';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { requireAdmin } from '@/lib/admin/auth';
import { parseAdminListPagination } from '@/lib/admin/list-pagination';
import { listAdminSubscriptions } from '@/lib/admin/queries';
import type { AdminSubscriptionSortField } from '@/lib/admin/types';
import {
  reconcileAllPendingAsaasSubscriptions,
  reconcilePendingAsaasSubscriptions,
} from '@/lib/asaas/reconcile-pending';
import type { BillingTerm } from '@/lib/checkout/combo-billing';
import { isComboTerm } from '@/lib/checkout/combo-billing';
import type { SubscriptionStatus } from '@/lib/dashboard/types';
import { formatDate, formatMoney } from '@/lib/dashboard/format';

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

function parseSubscriptionFilters(
  searchParams: Record<string, string | undefined>
) {
  const pagination = parseAdminListPagination(searchParams, {
    defaultSort: 'created_at',
    defaultOrder: 'desc',
    allowedSorts: [
      'created_at',
      'started_at',
      'next_billing_date',
      'cancelled_at',
      'current_cycle',
    ] satisfies AdminSubscriptionSortField[],
  });

  return {
    q: searchParams.q?.trim() || undefined,
    status: searchParams.status?.trim() || undefined,
    page: pagination.page,
    pageSize: pagination.pageSize,
    sort: pagination.sort as AdminSubscriptionSortField,
    order: pagination.order,
  };
}

export default async function AdminSubscriptionsPage({ searchParams }: Props) {
  const { admin } = await requireAdmin();
  const params = await searchParams;
  const filters = parseSubscriptionFilters(params);

  let result = await listAdminSubscriptions(admin, filters);

  if (filters.status === 'pending') {
    await reconcileAllPendingAsaasSubscriptions(admin);
  } else if (result.items.some((row) => row.status === 'pending')) {
    await reconcilePendingAsaasSubscriptions(
      admin,
      result.items.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        status: row.status,
        asaas_subscription_id: row.asaas_subscription_id,
        asaas_customer_id: row.asaas_customer_id,
        billing_term: row.billingTerm,
      }))
    );
  }

  if (
    filters.status === 'pending' ||
    result.items.some((row) => row.status === 'pending')
  ) {
    result = await listAdminSubscriptions(admin, filters);
  }

  const subscriptions = result.items;

  return (
    <div className="space-y-6">
      <AdminSubscriptionsFiltersForm
        values={{
          q: filters.q,
          status: filters.status,
          sort: filters.sort,
          order: filters.order,
          pageSize: filters.pageSize,
        }}
      />

      <RepairPlanUpgradeAsaasButton />

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
                <PlanUpgradeBadge upgrade={row.planUpgrade} compact />
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

      <AdminListPagination
        basePath="/admin/assinaturas"
        result={result}
        searchParams={params}
        noun="assinatura"
      />

      <p className="text-xs text-stone-500">
        <Link href="/admin/assinaturas" className="text-console hover:underline">
          Limpar filtros
        </Link>
      </p>
    </div>
  );
}
