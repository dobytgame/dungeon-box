import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import AdminSubscriptionActions from '@/components/admin/AdminSubscriptionActions';
import ComboBadge from '@/components/admin/ComboBadge';
import PartnerSubscriptionPanel from '@/components/admin/PartnerSubscriptionPanel';
import AdminTable from '@/components/admin/AdminTable';
import PaintKitAddonLink from '@/components/admin/PaintKitAddonLink';
import PendingPaymentLinkPanel from '@/components/admin/PendingPaymentLinkPanel';
import DataRow from '@/components/dashboard/DataRow';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { hasPaintKitBump } from '@/lib/checkout/special-notes';
import type { BillingTerm } from '@/lib/checkout/combo-billing';
import { isComboTerm } from '@/lib/checkout/combo-billing';
import { getSubscriptionComboSummary } from '@/lib/checkout/combo-display';
import { requireAdmin } from '@/lib/admin/auth';
import { getAdminSubscriptionDetail } from '@/lib/admin/queries';
import { reconcilePendingAsaasSubscription } from '@/lib/asaas/reconcile-pending';
import { buildAdminPendingPaymentPanel } from '@/lib/admin/pending-payment';
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

  let subscription = await getAdminSubscriptionDetail(admin, id);
  if (!subscription) notFound();

  if (subscription.status === 'pending') {
    await reconcilePendingAsaasSubscription(admin, {
      id: subscription.id,
      status: subscription.status,
      asaas_subscription_id: subscription.asaas_subscription_id,
      asaas_customer_id: subscription.asaas_customer_id,
      billing_term: subscription.billing_term,
    });
    subscription = (await getAdminSubscriptionDetail(admin, id)) ?? subscription;
  }

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
  const showPaintKitLink =
    subscription.status === 'active' &&
    !hasPaintKitBump(subscription.special_notes);
  const headerList = await headers();
  const origin = headerList.get('x-forwarded-host')
    ? `${headerList.get('x-forwarded-proto') ?? 'https'}://${headerList.get('x-forwarded-host')}`
    : headerList.get('origin');

  const pendingPaymentPanel =
    (subscription.status === 'pending' || subscription.status === 'past_due') &&
    !subscription.is_partner
      ? await buildAdminPendingPaymentPanel(admin, {
          subscriptionId: subscription.id,
        })
      : null;

  const combo = getSubscriptionComboSummary(subscription, plan?.slug ?? null);
  const billingTerm = (subscription.billing_term ?? 'monthly') as BillingTerm;
  const showAsaasSync =
    !subscription.is_partner &&
    Boolean(subscription.asaas_subscription_id || subscription.asaas_customer_id);

  return (
    <div className="space-y-8">
      <Link
        href="/admin/assinaturas"
        className="inline-block text-xs uppercase tracking-widest text-stone-500 hover:text-console"
      >
        ← Voltar para assinaturas
      </Link>

      <section className="rounded-sm border border-white/[0.06] p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg uppercase tracking-wide text-white">
              {plan?.name ?? 'Assinatura'}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              {profile?.full_name ?? profile?.display_name ?? profile?.email}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge kind="subscription" status={subscription.status} />
            {subscription.is_partner ? (
              <span className="rounded-sm border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-violet-200">
                Parceiro
              </span>
            ) : null}
            {isComboTerm(billingTerm) ? (
              <ComboBadge term={billingTerm} />
            ) : null}
          </div>
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
            value={
              subscription.is_partner
                ? '— (parceiro, sem cobrança)'
                : formatDate(subscription.next_billing_date)
            }
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
          {combo ? (
            <>
              <DataRow label="Pacote" value={combo.label} />
              <DataRow
                label="Valor do combo"
                value={
                  combo.comboTotalCents
                    ? `${formatMoney(combo.comboTotalCents)}${
                        combo.installmentLabel ? ` · ${combo.installmentLabel}` : ''
                      }`
                    : '—'
                }
              />
              <DataRow
                label="Combo ativo até"
                value={
                  combo.prepaidUntil
                    ? formatDate(combo.prepaidUntil)
                    : '—'
                }
              />
            </>
          ) : null}
          <DataRow
            label="Parceiro"
            value={subscription.is_partner ? 'Sim — sem cobrança' : 'Não'}
          />
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

      {showPaintKitLink ? (
        <PaintKitAddonLink subscriptionId={subscription.id} origin={origin} />
      ) : null}

      {pendingPaymentPanel ? (
        <PendingPaymentLinkPanel {...pendingPaymentPanel} />
      ) : null}

      <PartnerSubscriptionPanel subscription={subscription} />

      <AdminSubscriptionActions
        subscription={subscription}
        showAsaasSync={showAsaasSync}
      />

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
