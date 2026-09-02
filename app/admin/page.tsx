import Link from 'next/link';
import { Suspense } from 'react';
import AdminSection from '@/components/admin/AdminSection';
import AdminActivePlansChart from '@/components/admin/AdminActivePlansChart';
import AdminDailySalesChart from '@/components/admin/AdminDailySalesChart';
import AdminProfitMarginChart from '@/components/admin/AdminProfitMarginChart';
import AdminSubscriptionMetricsChart from '@/components/admin/AdminSubscriptionMetricsChart';
import AdminTable from '@/components/admin/AdminTable';
import AdminUserPlanChart from '@/components/admin/AdminUserPlanChart';
import KpiCard from '@/components/admin/KpiCard';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { requireAdmin } from '@/lib/admin/auth';
import { getDailySalesChartData } from '@/lib/admin/daily-sales';
import { getAdminDashboardStats } from '@/lib/admin/queries';
import { getSubscriptionMetricsChartData } from '@/lib/admin/subscription-metrics';
import { formatDate, formatMoney } from '@/lib/dashboard/format';

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AdminDashboardPage({ searchParams }: Props) {
  const { admin } = await requireAdmin();
  const params = await searchParams;
  const [stats, dailySales, subscriptionMetrics] = await Promise.all([
    getAdminDashboardStats(admin),
    getDailySalesChartData(admin, params),
    getSubscriptionMetricsChartData(admin, params),
  ]);

  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Faturamento total"
          value={formatMoney(stats.totalRevenueCents)}
          hint={`${stats.totalPaymentsApproved} pagamentos aprovados`}
          accent="gold"
        />
        <KpiCard
          label="Vendas (30d)"
          value={formatMoney(stats.profit30d.salesCents)}
          hint={`${stats.paymentsApproved30d} pagamentos aprovados`}
          accent="console"
        />
        <KpiCard
          label="Custo dos pedidos (30d)"
          value={formatMoney(stats.profit30d.orderCostCents)}
          hint="Custo de produção dos pedidos vendidos"
          accent="danger"
        />
        <KpiCard
          label="Lucro bruto (30d)"
          value={formatMoney(stats.profit30d.profitCents)}
          hint={
            stats.profit30d.marginPercent != null
              ? `${stats.profit30d.marginPercent}% de margem de produto`
              : 'Vendas − custo dos pedidos vendidos'
          }
          accent={stats.profit30d.profitCents >= 0 ? 'gold' : 'danger'}
        />
        <KpiCard
          label="MRR"
          value={formatMoney(stats.mrrCents)}
          hint={`${stats.activeSubscribers} assinantes ativos · inclui combos`}
          accent="console"
        />
        <KpiCard
          label="MRR recorrente"
          value={formatMoney(stats.recurringMrrCents)}
          hint={
            stats.comboActiveCount > 0
              ? `${stats.recurringSubscribers} mensais · ${stats.comboActiveCount} combo${stats.comboActiveCount === 1 ? '' : 's'} descontado${stats.comboActiveCount === 1 ? '' : 's'}`
              : `${stats.recurringSubscribers} assinantes mensais`
          }
          accent="gold"
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Novos (30d)"
          value={String(stats.newSubscribers30d)}
          hint={`${subscriptionMetrics.totals.newCount} no período do gráfico`}
          accent="console"
        />
        <KpiCard
          label="Cancelamentos (30d)"
          value={String(stats.cancelled30d)}
          hint={
            subscriptionMetrics.summary.churnRatePercent != null
              ? `${subscriptionMetrics.summary.churnRatePercent}% churn no período`
              : 'Assinaturas canceladas'
          }
          accent="danger"
        />
        <KpiCard
          label="Renovações"
          value={String(subscriptionMetrics.totals.renewalCount)}
          hint={
            subscriptionMetrics.totals.renewalRevenueCents > 0
              ? `${formatMoney(subscriptionMetrics.totals.renewalRevenueCents)} · ${subscriptionMetrics.periodLabel}`
              : subscriptionMetrics.periodLabel
          }
          accent="gold"
        />
        <KpiCard
          label="Crescimento líquido"
          value={
            subscriptionMetrics.totals.netGrowth >= 0
              ? `+${subscriptionMetrics.totals.netGrowth}`
              : String(subscriptionMetrics.totals.netGrowth)
          }
          hint="Novos − cancelamentos"
          accent={subscriptionMetrics.totals.netGrowth >= 0 ? 'console' : 'danger'}
        />
        <KpiCard
          label="Retenção"
          value={
            subscriptionMetrics.summary.retentionRatePercent != null
              ? `${subscriptionMetrics.summary.retentionRatePercent}%`
              : '—'
          }
          hint="Renovações ÷ (renovações + cancelamentos)"
        />
        <KpiCard
          label="Fila de envio"
          value={String(stats.cyclesPendingShip)}
          hint={`${stats.cyclesPreparing} ciclos em produção`}
          accent="warn"
        />
        <KpiCard
          label="Em atraso"
          value={String(stats.pastDueCount)}
          hint="Assinaturas past_due"
          accent="danger"
        />
        <KpiCard
          label="Pendentes"
          value={String(stats.pendingSubscriptions)}
          hint="Aguardando ativação"
          accent="warn"
        />
      </section>

      <AdminSection
        title="Assinaturas"
        action={{ href: '/admin/assinaturas', label: 'Ver assinaturas' }}
      >
        <Suspense
          fallback={
            <div className="admin-panel rounded p-6 font-mono text-xs text-zinc-600">
              Carregando gráfico…
            </div>
          }
        >
          <AdminSubscriptionMetricsChart data={subscriptionMetrics} />
        </Suspense>
      </AdminSection>

      <AdminSection
        title="Receita diária"
        action={{ href: '/admin/vendas', label: 'Ver vendas' }}
      >
        <Suspense
          fallback={
            <div className="admin-panel rounded p-6 font-mono text-xs text-zinc-600">
              Carregando gráfico…
            </div>
          }
        >
          <AdminDailySalesChart data={dailySales} />
        </Suspense>
      </AdminSection>

      <AdminSection
        title="Margem de produto"
        action={{ href: '/admin/financeiro', label: 'Ver financeiro' }}
      >
        <AdminProfitMarginChart rows={stats.profitByMonth} />
      </AdminSection>

      <AdminSection title="Indicações por link parceiro">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <KpiCard
            label="Visitas nos links"
            value={String(stats.partnerReferralStats.totalLinkVisits)}
            hint="Acessos com ?ref="
            accent="console"
          />
          <KpiCard
            label="Cadastros"
            value={String(stats.partnerReferralStats.totalSignups)}
            hint="Conta criada via link"
          />
          <KpiCard
            label="Assinaturas"
            value={String(stats.partnerReferralStats.totalAttributedCustomers)}
            hint={`${stats.partnerReferralStats.activeReferrers} parceiros ativos`}
          />
          <KpiCard
            label="Qualificados"
            value={String(stats.partnerReferralStats.qualifiedCustomers)}
            hint="Indicações convertidas"
            accent="gold"
          />
          <KpiCard
            label="Pendentes"
            value={String(stats.partnerReferralStats.pendingCustomers)}
            hint="Aguardando qualificação"
            accent="warn"
          />
          <KpiCard
            label="Parceiros"
            value={String(stats.partnerReferralStats.activeReferrers)}
            hint="Com cadastro ou assinatura"
          />
        </section>

        <div className="mt-6">
          <AdminTable
            rows={stats.partnerReferralStats.topReferrers.map((row) => ({
              ...row,
              id: row.userId,
            }))}
            getRowHref={(row) => `/admin/clientes/${row.userId}`}
            columns={[
              {
                key: 'name',
                header: 'Parceiro',
                cell: (row) => (
                  <div>
                    <p>{row.name ?? '—'}</p>
                    <p className="font-mono text-[11px] text-zinc-600">{row.email}</p>
                  </div>
                ),
              },
              {
                key: 'code',
                header: 'Código',
                cell: (row) => (
                  <span className="font-mono text-xs text-console">{row.code}</span>
                ),
              },
              {
                key: 'visits',
                header: 'Visitas',
                cell: (row) => String(row.totalVisits),
              },
              {
                key: 'signups',
                header: 'Cadastros',
                cell: (row) => String(row.totalSignups),
              },
              {
                key: 'total',
                header: 'Assinaturas',
                cell: (row) => String(row.totalReferrals),
              },
              {
                key: 'qualified',
                header: 'Qualificados',
                cell: (row) => String(row.qualifiedCount),
              },
              {
                key: 'pending',
                header: 'Pendentes',
                cell: (row) => String(row.pendingCount),
              },
            ]}
            emptyMessage="Nenhuma indicação registrada ainda."
          />
        </div>
      </AdminSection>

      <AdminSection
        title="Base de usuários"
        action={{ href: '/admin/marketing', label: 'Enviar campanha' }}
      >
        <AdminUserPlanChart
          withActivePlan={stats.userPlanStats.withActivePlan}
          withoutActivePlan={stats.userPlanStats.withoutActivePlan}
          totalProfiles={stats.userPlanStats.totalProfiles}
        />
      </AdminSection>

      <AdminSection title="Planos assinados">
        <AdminActivePlansChart
          plans={stats.activePlanCounts}
          totalActive={stats.activeSubscribers}
        />
      </AdminSection>

      {stats.mrrByPlan.length > 0 ? (
        <AdminSection title="MRR por plano">
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.mrrByPlan.map((row) => (
              <div key={row.planName} className="admin-panel rounded p-4">
                <p className="text-sm text-zinc-200">{row.planName}</p>
                <p className="mt-1 font-mono text-xl tabular-nums text-console">
                  {formatMoney(row.mrrCents)}
                </p>
                <p className="mt-1 font-mono text-[11px] text-zinc-600">
                  {row.subscribers} assinantes
                </p>
              </div>
            ))}
          </div>
        </AdminSection>
      ) : null}

      <AdminSection title="Aguardando coleta" action={{ href: '/admin/ciclos', label: 'Abrir produção' }}>
        <AdminTable
          rows={stats.shipQueue}
          getRowHref={(row) => `/admin/ciclos/${row.id}`}
          columns={[
            {
              key: 'customer',
              header: 'Cliente',
              cell: (row) => (
                <div>
                  <p>{row.customerName ?? '—'}</p>
                  <p className="font-mono text-[11px] text-zinc-600">{row.customerEmail}</p>
                </div>
              ),
            },
            {
              key: 'cycle',
              header: 'Ciclo',
              cell: (row) => `#${row.cycle_number}`,
            },
            {
              key: 'theme',
              header: 'Tema',
              cell: (row) => row.themeName ?? '—',
            },
            {
              key: 'location',
              header: 'Destino',
              cell: (row) =>
                row.city && row.state ? `${row.city}/${row.state}` : '—',
            },
          ]}
          emptyMessage="Nenhuma caixa aguardando rastreio."
        />
      </AdminSection>

      <AdminSection
        title="Pagamentos recentes"
        action={{ href: '/admin/pagamentos', label: 'Ver todos' }}
      >
        <AdminTable
          rows={stats.recentPayments}
          columns={[
            {
              key: 'amount',
              header: 'Valor',
              cell: (row) => (
                <span className="font-mono tabular-nums">
                  {formatMoney(row.effectiveAmountCents)}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              cell: (row) => <StatusBadge kind="payment" status={row.status} />,
            },
            {
              key: 'paid',
              header: 'Pago em',
              cell: (row) => (
                <span className="font-mono text-[11px] text-zinc-400">
                  {formatDate(row.paid_at ?? row.created_at)}
                </span>
              ),
            },
            {
              key: 'method',
              header: 'Método',
              cell: (row) => row.payment_method ?? '—',
            },
          ]}
          emptyMessage="Nenhum pagamento registrado."
        />
      </AdminSection>
    </div>
  );
}
