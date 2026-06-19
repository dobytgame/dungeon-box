import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdminSubscriptionActions from '@/components/admin/AdminSubscriptionActions';
import AdminTable from '@/components/admin/AdminTable';
import SyncAsaasButton from '@/components/admin/SyncAsaasButton';
import DataRow from '@/components/dashboard/DataRow';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { requireAdmin } from '@/lib/admin/auth';
import { getAdminSubscriptionDetail } from '@/lib/admin/queries';
import {
  formatDate,
  formatDateTime,
  formatMoney,
  relOne,
} from '@/lib/dashboard/format';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminSubscriptionDetailPage({ params }: Props) {
  const { id } = await params;
  const { admin } = await requireAdmin();
  const subscription = await getAdminSubscriptionDetail(admin, id);

  if (!subscription) notFound();

  const plan = relOne(subscription.plans);
  const pendingPlan = relOne(subscription.pending_plan);
  const address = relOne(subscription.addresses);
  const profile = relOne(
    (subscription as { profiles?: unknown }).profiles as
      | { full_name?: string | null; display_name?: string | null; email?: string; phone?: string | null; cpf?: string | null }
      | { full_name?: string | null; display_name?: string | null; email?: string; phone?: string | null; cpf?: string | null }[]
      | null
      | undefined
  );
  const cycles = subscription.subscription_cycles ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/admin/assinaturas"
          className="inline-block text-xs uppercase tracking-widest text-stone-500 hover:text-console"
        >
          ← Voltar para assinaturas
        </Link>
        {subscription.asaas_subscription_id ? (
          <SyncAsaasButton subscriptionId={subscription.id} />
        ) : null}
      </div>

      <section className="rounded-sm border border-white/[0.06] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg uppercase tracking-wide text-white">
              {plan?.name ?? 'Assinatura'}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              {profile?.full_name ?? profile?.display_name ?? profile?.email}
            </p>
          </div>
          <StatusBadge kind="subscription" status={subscription.status} />
        </div>

        <dl className="mt-6">
          <DataRow
            label="Plano"
            value={
              plan
                ? `${plan.name} · ${formatMoney(plan.price_cents)}/mês`
                : '—'
            }
          />
          {pendingPlan ? (
            <DataRow
              label="Upgrade pendente"
              value={`${pendingPlan.name} · ${formatMoney(pendingPlan.price_cents)}/mês`}
            />
          ) : null}
          <DataRow
            label="Ciclo atual"
            value={
              subscription.current_cycle != null
                ? `#${subscription.current_cycle}`
                : '—'
            }
          />
          <DataRow
            label="Próxima cobrança"
            value={formatDate(subscription.next_billing_date)}
          />
          <DataRow
            label="Membro desde"
            value={formatDate(subscription.started_at)}
          />
          <DataRow
            label="Frete"
            value={formatMoney(subscription.shipping_cents ?? 0)}
          />
          <DataRow label="Cupom" value={subscription.promo_code} />
          <DataRow
            label="Asaas"
            value={subscription.asaas_subscription_id}
            mono
          />
          <DataRow
            label="Stripe"
            value={subscription.stripe_subscription_id}
            mono
          />
          <DataRow
            label="Cliente"
            value={
              profile?.email ? (
                <Link
                  href={`/admin/clientes/${subscription.user_id}`}
                  className="text-console hover:underline"
                >
                  {profile.email}
                </Link>
              ) : (
                '—'
              )
            }
          />
          {address ? (
            <DataRow
              label="Endereço"
              value={`${address.street}, ${address.number} — ${address.city}/${address.state}`}
            />
          ) : null}
          <DataRow
            label="Atualizado"
            value={formatDateTime(subscription.updated_at)}
          />
        </dl>
      </section>

      <AdminSubscriptionActions subscription={subscription} />

      <section>
        <h3 className="font-display text-sm uppercase tracking-widest text-stone-400">
          Ciclos
        </h3>
        <div className="mt-4">
          <AdminTable
            rows={cycles.map((cycle) => ({ ...cycle, id: cycle.id }))}
            getRowHref={(row) => `/admin/ciclos/${row.id}`}
            columns={[
              {
                key: 'cycle',
                header: 'Ciclo',
                cell: (row) => `#${row.cycle_number}`,
              },
              {
                key: 'theme',
                header: 'Tema',
                cell: (row) => relOne(row.themes)?.name ?? '—',
              },
              {
                key: 'status',
                header: 'Status',
                cell: (row) => (
                  <StatusBadge kind="cycle" status={row.status} />
                ),
              },
              {
                key: 'tracking',
                header: 'Rastreio',
                cell: (row) => row.tracking_code ?? '—',
              },
              {
                key: 'shipped',
                header: 'Enviado',
                cell: (row) => formatDate(row.shipped_at),
              },
            ]}
            emptyMessage="Nenhum ciclo registrado."
          />
        </div>
      </section>
    </div>
  );
}
