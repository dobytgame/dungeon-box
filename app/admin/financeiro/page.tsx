import Link from 'next/link';
import AdminCashFlowChart from '@/components/admin/AdminCashFlowChart';
import AdminProfitMarginChart from '@/components/admin/AdminProfitMarginChart';
import AdminSection from '@/components/admin/AdminSection';
import AdminTable from '@/components/admin/AdminTable';
import KpiCard from '@/components/admin/KpiCard';
import { requireAdmin } from '@/lib/admin/auth';
import { getFinancialDashboard } from '@/lib/admin/finance';
import type {
  AdminFinancialMovementRow,
  AdminFinancialPeriod,
} from '@/lib/admin/types';
import { formatDate, formatMoney } from '@/lib/dashboard/format';

const PERIOD_OPTIONS: { value: AdminFinancialPeriod; label: string }[] = [
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: 'year', label: 'Ano atual' },
  { value: 'all', label: 'Tudo' },
];

const MOVEMENT_KIND: Record<
  AdminFinancialMovementRow['kind'],
  { label: string; className: string }
> = {
  income: { label: 'Entrada', className: 'text-console' },
  expense: { label: 'Gasto', className: 'text-red-300' },
  expense_pending: { label: 'Gasto pend.', className: 'text-amber-300' },
  refund: { label: 'Reembolso', className: 'text-orange-300' },
};

interface Props {
  searchParams: Promise<{ period?: string }>;
}

export default async function AdminFinancePage({ searchParams }: Props) {
  const { admin } = await requireAdmin();
  const { period: periodRaw } = await searchParams;
  const period = (
    PERIOD_OPTIONS.some((p) => p.value === periodRaw) ? periodRaw : '30d'
  ) as AdminFinancialPeriod;

  const dashboard = await getFinancialDashboard(admin, period);
  const { summary, profit, cashFlow, profitByMonth, movements } = dashboard;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form className="flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((option) => (
            <Link
              key={option.value}
              href={`/admin/financeiro?period=${option.value}`}
              className={`rounded-sm border px-3 py-2 font-mono text-[10px] uppercase tracking-widest transition ${
                period === option.value
                  ? 'border-console/40 bg-console/10 text-console'
                  : 'border-white/10 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {option.label}
            </Link>
          ))}
        </form>
        <Link
          href="/admin/financeiro/gastos"
          className="rounded-sm bg-console px-4 py-2.5 font-display text-xs uppercase tracking-widest text-stone-950"
        >
          Gerenciar gastos
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Vendas"
          value={formatMoney(profit.salesCents)}
          hint={`${summary.revenueCount} pagamentos aprovados`}
          accent="console"
        />
        <KpiCard
          label="Custo dos pedidos"
          value={formatMoney(profit.orderCostCents)}
          hint="Custo de produção dos pedidos vendidos no período"
          accent="danger"
        />
        <KpiCard
          label="Lucro bruto"
          value={formatMoney(profit.profitCents)}
          hint={
            profit.marginPercent != null
              ? `${profit.marginPercent}% de margem de produto`
              : `${formatDate(summary.from)} — ${formatDate(summary.to)}`
          }
          accent={profit.profitCents >= 0 ? 'gold' : 'danger'}
        />
        <KpiCard
          label="Gastos pendentes"
          value={formatMoney(summary.pendingExpenseCents)}
          hint={`${summary.pendingExpenseCount} lançamento(s) a pagar`}
          accent="warn"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <AdminProfitMarginChart rows={profitByMonth} />

        <AdminCashFlowChart rows={cashFlow} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="admin-panel rounded p-5 md:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Gastos por categoria
          </p>
          <h3 className="mt-2 text-lg font-medium text-zinc-100">Distribuição no período</h3>

          {summary.expensesByCategory.length === 0 ? (
            <p className="mt-6 font-mono text-xs text-zinc-600">
              Nenhum gasto pago no período.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {summary.expensesByCategory.map((row) => {
                const pct =
                  summary.expenseCents > 0
                    ? Math.round((row.cents / summary.expenseCents) * 100)
                    : 0;

                return (
                  <div key={row.id}>
                    <div className="mb-1.5 flex items-end justify-between gap-3">
                      <p className="text-sm font-medium text-zinc-200">{row.name}</p>
                      <div className="text-right">
                        <p className="font-mono text-sm tabular-nums text-red-300">
                          {formatMoney(row.cents)}
                        </p>
                        <p className="font-mono text-[10px] text-zinc-600">
                          {row.count} lanç. · {pct}%
                        </p>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
                      <div
                        className="h-full rounded-full bg-red-400/60"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="admin-panel rounded p-5 md:p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Custo dos pedidos
          </p>
          <h3 className="mt-2 text-lg font-medium text-zinc-100">Pedidos vendidos no período</h3>
          <p className="mt-4 text-sm leading-relaxed text-zinc-500">
            Mensalidades e loja: custo no pagamento. Combos: 1 caixa por mês quando o ciclo
            entra em produção (não tudo de uma vez no pagamento do combo).
          </p>
          <p className="mt-6 font-mono text-3xl tabular-nums text-red-300">
            {formatMoney(profit.orderCostCents)}
          </p>
        </div>
      </section>

      <AdminSection
        title="Movimentações recentes"
        action={{ href: '/admin/vendas', label: 'Ver vendas' }}
      >
        <AdminTable
          rows={movements}
          columns={[
            {
              key: 'kind',
              header: 'Tipo',
              cell: (row: AdminFinancialMovementRow) => (
                <span
                  className={`font-mono text-[10px] uppercase tracking-widest ${MOVEMENT_KIND[row.kind].className}`}
                >
                  {MOVEMENT_KIND[row.kind].label}
                </span>
              ),
            },
            {
              key: 'label',
              header: 'Descrição',
              cell: (row: AdminFinancialMovementRow) => (
                <div>
                  <p className="text-sm text-zinc-300">{row.label}</p>
                  {row.categoryName ? (
                    <p className="font-mono text-[10px] text-zinc-600">{row.categoryName}</p>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'counterparty',
              header: 'Cliente / Fornecedor',
              cell: (row: AdminFinancialMovementRow) => (
                <span className="text-sm text-zinc-400">{row.counterparty ?? '—'}</span>
              ),
            },
            {
              key: 'amount',
              header: 'Valor',
              cell: (row: AdminFinancialMovementRow) => (
                <span
                  className={`font-mono tabular-nums ${
                    row.amount_cents >= 0 ? 'text-console' : 'text-red-300'
                  }`}
                >
                  {row.amount_cents >= 0 ? '+' : '−'}
                  {formatMoney(Math.abs(row.amount_cents))}
                </span>
              ),
            },
            {
              key: 'date',
              header: 'Data',
              cell: (row: AdminFinancialMovementRow) => (
                <span className="font-mono text-[11px] text-zinc-400">
                  {formatDate(row.date)}
                </span>
              ),
            },
          ]}
          emptyMessage="Nenhuma movimentação no período."
        />
      </AdminSection>
    </div>
  );
}
