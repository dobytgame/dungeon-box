import Link from 'next/link';
import { Suspense } from 'react';
import AdminDailySalesChart from '@/components/admin/AdminDailySalesChart';
import AdminSalesFiltersForm from '@/components/admin/AdminSalesFiltersForm';
import AdminSalesTable from '@/components/admin/AdminSalesTable';
import AdminSection from '@/components/admin/AdminSection';
import KpiCard from '@/components/admin/KpiCard';
import { requireAdmin } from '@/lib/admin/auth';
import { getDailySalesChartData } from '@/lib/admin/daily-sales';
import { getAdminSalesPageData } from '@/lib/admin/sales';
import { formatDate, formatMoney } from '@/lib/dashboard/format';

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AdminSalesPage({ searchParams }: Props) {
  const { admin } = await requireAdmin();
  const params = await searchParams;

  const [{ filters, sales, summary }, chartData] = await Promise.all([
    getAdminSalesPageData(admin, params),
    getDailySalesChartData(admin, params),
  ]);

  const chartFilters = chartData.filters;

  return (
    <div className="space-y-8">
      <AdminSalesFiltersForm
        values={{
          q: filters.q,
          status: filters.status,
          type: filters.saleType,
          salesYear: chartFilters.year,
          salesMonth: chartFilters.month,
          salesPeriod: chartFilters.period,
        }}
        availableYears={chartData.availableYears}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Receita no período"
          value={formatMoney(summary.revenueCents)}
          hint={`${summary.periodLabel} · aprovadas que contam`}
          accent="gold"
        />
        <KpiCard
          label="Vendas aprovadas"
          value={String(summary.approvedCount)}
          hint={`${summary.visibleCount} linha(s) · ${summary.hiddenInstallmentCount} parcela(s) oculta(s)`}
          accent="console"
        />
        <KpiCard
          label="Assinaturas"
          value={String(summary.byType.assinatura.count)}
          hint={formatMoney(summary.byType.assinatura.revenueCents)}
        />
        <KpiCard
          label="Loja"
          value={String(
            summary.byType.loja_avulsa.count + summary.byType.loja_bundled.count
          )}
          hint={formatMoney(
            summary.byType.loja_avulsa.revenueCents +
              summary.byType.loja_bundled.revenueCents
          )}
        />
        <KpiCard
          label="Pendentes"
          value={String(summary.pendingCount)}
          hint="Aguardando confirmação"
          accent="warn"
        />
      </section>

      <AdminSection title="Gráfico de vendas">
        <Suspense
          fallback={
            <div className="admin-panel rounded p-6 font-mono text-xs text-zinc-600">
              Carregando gráfico…
            </div>
          }
        >
          <AdminDailySalesChart data={chartData} />
        </Suspense>
      </AdminSection>

      <AdminSection title="Lista de vendas">
        <div className="mb-3 px-1 font-mono text-[11px] text-zinc-600">
          {summary.visibleCount} venda(s) exibida(s)
          {summary.hiddenInstallmentCount > 0
            ? ` · ${summary.hiddenInstallmentCount} parcela(s) de combo recolhida(s)`
            : ''}{' '}
          entre <span className="text-zinc-400">{formatDate(filters.from)}</span> e{' '}
          <span className="text-zinc-400">{formatDate(filters.to)}</span>
          {filters.q ? (
            <>
              {' '}
              · busca: <span className="text-zinc-400">&quot;{filters.q}&quot;</span>
            </>
          ) : null}
        </div>

        <AdminSalesTable sales={sales} />
      </AdminSection>

      <p className="font-mono text-[11px] text-zinc-600">
        Combos parcelados aparecem com o valor total. Clique em{' '}
        <span className="text-zinc-400">+</span> na linha para ver as parcelas do Asaas.{' '}
        <Link href="/admin/pagamentos" className="text-console hover:underline">
          Ver pagamentos brutos
        </Link>
      </p>
    </div>
  );
}
