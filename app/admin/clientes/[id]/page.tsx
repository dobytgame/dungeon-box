import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdminTable from '@/components/admin/AdminTable';
import ComboBadge from '@/components/admin/ComboBadge';
import CustomerPartnerPanel from '@/components/admin/CustomerPartnerPanel';
import CustomerActivatePlanPanel from '@/components/admin/CustomerActivatePlanPanel';
import PartnerBadge from '@/components/admin/PartnerBadge';
import ReferralAttributionBadge from '@/components/admin/ReferralAttributionBadge';
import SyncAsaasButton from '@/components/admin/SyncAsaasButton';
import AdminGatewayMigrationTools from '@/components/admin/AdminGatewayMigrationTools';
import DataRow from '@/components/dashboard/DataRow';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { requireAdmin } from '@/lib/admin/auth';
import { getAdminCustomerDetail } from '@/lib/admin/queries';
import { reconcilePendingAsaasSubscriptions } from '@/lib/asaas/reconcile-pending';
import { PAGARME_CONFIGURED } from '@/lib/pagarme/client';
import { isAsaasSubscriptionNeedingPagarmeMigration } from '@/lib/pagarme/complete-asaas-migration';
import { PLAN_SLUGS } from '@/lib/checkout/plans';
import type { BillingTerm } from '@/lib/checkout/combo-billing';
import { isComboTerm } from '@/lib/checkout/combo-billing';
import {
  resolveEffectivePaymentAmountCents,
  resolvePaymentInstallments,
} from '@/lib/payments/effective-amount';
import { comboInstallmentLabel } from '@/lib/checkout/combo-billing';
import {
  formatCpf,
  formatDate,
  formatDateTime,
  formatMoney,
  formatPhone,
  relOne,
} from '@/lib/dashboard/format';
import {
  PLAN_CHANGE_ACTOR_LABELS,
  PLAN_CHANGE_EVENT_LABELS,
} from '@/lib/subscriptions/plan-change-log';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminCustomerDetailPage({ params }: Props) {
  const { id } = await params;
  const { admin } = await requireAdmin();
  const detail = await getAdminCustomerDetail(admin, id);

  if (!detail) notFound();

  const pendingAsaas = detail.subscriptions.filter(
    (sub) =>
      sub.status === 'pending' &&
      (sub.asaas_subscription_id || sub.asaas_customer_id)
  );

  if (pendingAsaas.length > 0) {
    await reconcilePendingAsaasSubscriptions(
      admin,
      pendingAsaas.map((sub) => ({
        id: sub.id,
        user_id: sub.user_id,
        status: sub.status,
        asaas_subscription_id: sub.asaas_subscription_id,
        asaas_customer_id: sub.asaas_customer_id,
        billing_term: sub.billing_term,
      }))
    );
    const refreshed = await getAdminCustomerDetail(admin, id);
    if (refreshed) {
      Object.assign(detail, refreshed);
    }
  }

  const { profile, addresses, subscriptions, payments, cycles, referralAttribution, planChanges } =
    detail;
  const name = profile.full_name ?? profile.display_name ?? profile.email;
  const isPartner = subscriptions.some(
    (sub) => sub.is_partner && sub.status === 'active'
  );

  const { data: planRows } = await admin
    .from('plans')
    .select('slug, name')
    .in('slug', [...PLAN_SLUGS])
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  const planOptions = (planRows ?? []).map((plan) => ({
    slug: plan.slug as (typeof PLAN_SLUGS)[number],
    name: plan.name as string,
  }));

  const partnerSubscriptions = subscriptions.map((sub) => ({
    id: sub.id,
    planName: relOne(sub.plans)?.name ?? null,
    planSlug: relOne(sub.plans)?.slug ?? null,
    status: sub.status,
    isPartner: Boolean(sub.is_partner),
  }));

  const addressOptions = addresses.map((address) => ({
    id: address.id,
    isDefault: Boolean(address.is_default),
    label: [
      address.recipient,
      `${address.street}, ${address.number}`,
      address.complement,
      `${address.neighborhood} · ${address.city}/${address.state}`,
      address.zip_code,
    ]
      .filter(Boolean)
      .join(' · '),
  }));

  return (
    <div className="space-y-8">
      <Link
        href="/admin/clientes"
        className="inline-block text-xs uppercase tracking-widest text-stone-500 hover:text-console"
      >
        ← Voltar para clientes
      </Link>

      <section className="rounded-sm border border-white/[0.06] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="font-display text-lg uppercase tracking-wide text-white">
            {name}
          </h2>
          {isPartner ? <PartnerBadge /> : null}
        </div>
        <dl className="mt-4">
          <DataRow label="E-mail" value={profile.email} />
          <DataRow label="Telefone" value={formatPhone(profile.phone)} />
          <DataRow label="CPF" value={formatCpf(profile.cpf)} mono />
          <DataRow label="Cadastro" value={formatDate(profile.created_at)} />
        </dl>
      </section>

      {referralAttribution ? (
        <section>
          <h3 className="font-display text-sm uppercase tracking-widest text-stone-400">
            Indicação
          </h3>
          <div className="mt-4">
            <ReferralAttributionBadge attribution={referralAttribution} />
          </div>
        </section>
      ) : null}

      <CustomerPartnerPanel
        userId={profile.id}
        subscriptions={partnerSubscriptions}
        planOptions={planOptions}
      />

      <CustomerActivatePlanPanel
        userId={profile.id}
        customerName={name}
        customerCpf={profile.cpf}
        customerPhone={profile.phone}
        planOptions={planOptions}
        addresses={addressOptions}
      />

      {addresses.length > 0 ? (
        <section>
          <h3 className="font-display text-sm uppercase tracking-widest text-stone-400">
            Endereços
          </h3>
          <div className="mt-4 space-y-3">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="rounded-sm border border-white/[0.06] p-4 text-sm text-stone-300"
              >
                <p>
                  {address.street}, {address.number}
                  {address.complement ? ` — ${address.complement}` : ''}
                </p>
                <p>
                  {address.neighborhood} · {address.city}/{address.state} ·{' '}
                  {address.zip_code}
                </p>
                {address.is_default ? (
                  <p className="mt-2 text-xs uppercase tracking-widest text-console">
                    Padrão
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="font-display text-sm uppercase tracking-widest text-stone-400">
          Assinaturas
        </h3>
        <div className="mt-4">
          <AdminTable
            rows={subscriptions.map((sub) => ({ ...sub, id: sub.id }))}
            getRowHref={(row) => `/admin/assinaturas/${row.id}`}
            columns={[
              {
                key: 'plan',
                header: 'Plano',
                cell: (row) => (
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{relOne(row.plans)?.name ?? '—'}</span>
                    {isComboTerm((row.billing_term ?? 'monthly') as BillingTerm) ? (
                      <ComboBadge
                        term={(row.billing_term ?? 'monthly') as BillingTerm}
                        compact
                      />
                    ) : null}
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                cell: (row) => (
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge kind="subscription" status={row.status} />
                    {row.is_partner ? <PartnerBadge compact /> : null}
                  </div>
                ),
              },
              {
                key: 'upgrade',
                header: 'Upgrade',
                cell: (row) => {
                  const pendingPlan = relOne(row.pending_plan);
                  if (!pendingPlan) {
                    return <span className="text-stone-600">—</span>;
                  }

                  return (
                    <span className="rounded-sm border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-100">
                      → {pendingPlan.name}
                    </span>
                  );
                },
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
                cell: (row) =>
                  row.is_partner
                    ? '— (parceiro)'
                    : formatDate(row.next_billing_date),
              },
              {
                key: 'asaas',
                header: 'Asaas',
                cell: (row) =>
                  !row.is_partner &&
                  (row.asaas_subscription_id || row.asaas_customer_id) ? (
                    <SyncAsaasButton subscriptionId={row.id} compact />
                  ) : (
                    <span className="font-mono text-[10px] text-zinc-600">—</span>
                  ),
              },
              {
                key: 'migration',
                header: 'Pagar.me',
                cell: (row) =>
                  PAGARME_CONFIGURED &&
                  !row.is_partner &&
                  isAsaasSubscriptionNeedingPagarmeMigration(row) ? (
                    <AdminGatewayMigrationTools subscriptionId={row.id} />
                  ) : (
                    <span className="font-mono text-[10px] text-zinc-600">—</span>
                  ),
              },
            ]}
            emptyMessage="Nenhuma assinatura."
          />
        </div>
      </section>

      <section>
        <h3 className="font-display text-sm uppercase tracking-widest text-stone-400">
          Histórico de upgrade de plano
        </h3>
        <div className="mt-4">
          <AdminTable
            rows={planChanges.map((change) => ({ ...change, id: change.id }))}
            columns={[
              {
                key: 'event',
                header: 'Evento',
                cell: (row) => PLAN_CHANGE_EVENT_LABELS[row.event],
              },
              {
                key: 'change',
                header: 'Mudança',
                cell: (row) => {
                  if (row.fromPlanName && row.toPlanName) {
                    return `${row.fromPlanName} → ${row.toPlanName}`;
                  }
                  if (row.toPlanName) {
                    return `→ ${row.toPlanName}`;
                  }
                  if (row.fromPlanName) {
                    return `${row.fromPlanName} → —`;
                  }
                  return '—';
                },
              },
              {
                key: 'actor',
                header: 'Origem',
                cell: (row) => PLAN_CHANGE_ACTOR_LABELS[row.actor],
              },
              {
                key: 'subscription',
                header: 'Assinatura',
                cell: (row) => (
                  <Link
                    href={`/admin/assinaturas/${row.subscription_id}`}
                    className="font-mono text-xs text-console hover:underline"
                  >
                    {row.subscription_id.slice(0, 8)}…
                  </Link>
                ),
              },
              {
                key: 'date',
                header: 'Data',
                cell: (row) => formatDateTime(row.created_at),
              },
            ]}
            emptyMessage="Nenhum upgrade registrado para este cliente."
          />
        </div>
      </section>

      <section>
        <h3 className="font-display text-sm uppercase tracking-widest text-stone-400">
          Ciclos recentes
        </h3>
        <div className="mt-4">
          <AdminTable
            rows={cycles.slice(0, 12).map((cycle) => ({ ...cycle, id: cycle.id }))}
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
            ]}
          />
        </div>
      </section>

      <section>
        <h3 className="font-display text-sm uppercase tracking-widest text-stone-400">
          Pagamentos
        </h3>
        <div className="mt-4">
          <AdminTable
            rows={payments.slice(0, 12).map((payment) => ({
              ...payment,
              id: payment.id,
            }))}
            columns={[
              {
                key: 'amount',
                header: 'Valor',
                cell: (row) => {
                  const subscription = subscriptions.find(
                    (sub) => sub.id === row.subscription_id
                  );
                  const effectiveAmount = resolveEffectivePaymentAmountCents(
                    row,
                    subscription
                  );
                  const installments = resolvePaymentInstallments(row, subscription);

                  return (
                    <div>
                      <p>{formatMoney(effectiveAmount)}</p>
                      {installments != null && installments > 1 ? (
                        <p className="text-xs text-stone-500">
                          {comboInstallmentLabel(installments)}
                        </p>
                      ) : null}
                    </div>
                  );
                },
              },
              {
                key: 'status',
                header: 'Status',
                cell: (row) => (
                  <StatusBadge kind="payment" status={row.status} />
                ),
              },
              {
                key: 'date',
                header: 'Data',
                cell: (row) => formatDate(row.paid_at ?? row.created_at),
              },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
