import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdminTable from '@/components/admin/AdminTable';
import ComboBadge from '@/components/admin/ComboBadge';
import CustomerPartnerPanel from '@/components/admin/CustomerPartnerPanel';
import PartnerBadge from '@/components/admin/PartnerBadge';
import DataRow from '@/components/dashboard/DataRow';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { requireAdmin } from '@/lib/admin/auth';
import { getAdminCustomerDetail } from '@/lib/admin/queries';
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
  formatMoney,
  formatPhone,
  relOne,
} from '@/lib/dashboard/format';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminCustomerDetailPage({ params }: Props) {
  const { id } = await params;
  const { admin } = await requireAdmin();
  const detail = await getAdminCustomerDetail(admin, id);

  if (!detail) notFound();

  const { profile, addresses, subscriptions, payments, cycles } = detail;
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

      <CustomerPartnerPanel
        userId={profile.id}
        subscriptions={partnerSubscriptions}
        planOptions={planOptions}
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
            ]}
            emptyMessage="Nenhuma assinatura."
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
