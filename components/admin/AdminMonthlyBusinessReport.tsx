import type { MonthlyBusinessReport } from '@/lib/admin/monthly-business-report';
import { formatMoney } from '@/lib/dashboard/format';

interface Props {
  report: MonthlyBusinessReport;
}

export default function AdminMonthlyBusinessReport({ report }: Props) {
  return (
    <div className="space-y-4">
      {report.loadWarning ? (
        <p className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Não foi possível carregar todos os pagamentos: {report.loadWarning}
        </p>
      ) : null}
      <p className="font-mono text-[11px] text-stone-600">
        {report.paymentsAnalyzed} pagamento(s) aprovado(s) analisado(s) entre{' '}
        {report.from} e {report.to}.
      </p>

      <div className="overflow-x-auto rounded-sm border border-white/[0.06]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-stone-950/80 font-mono text-[10px] uppercase tracking-widest text-stone-500">
            <tr>
              <th className="px-3 py-2">Mês</th>
              <th className="px-3 py-2 text-right">Receita</th>
              <th className="px-3 py-2 text-right">Vendas novas</th>
              <th className="px-3 py-2 text-right">Assinatura</th>
              <th className="px-3 py-2 text-right">Loja</th>
              <th className="px-3 py-2 text-right">Renovações</th>
              <th className="px-3 py-2 text-right">Novos clientes</th>
              <th className="px-3 py-2 text-right">Assinantes (fim)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] text-stone-200">
            {report.rows.map((row) => (
              <tr key={row.monthKey} className="hover:bg-white/[0.02]">
                <td className="px-3 py-2 capitalize">{row.monthLabel}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {formatMoney(row.totalRevenueCents)}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {row.newSalesCount}
                  <span className="block text-[11px] text-stone-500">
                    {formatMoney(row.newSalesRevenueCents)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {row.subscriptionNewCount}
                  <span className="block text-[11px] text-stone-500">
                    {formatMoney(row.subscriptionNewRevenueCents)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {row.storeNewCount}
                  <span className="block text-[11px] text-stone-500">
                    {formatMoney(row.storeNewRevenueCents)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {row.renewalCount}
                  <span className="block text-[11px] text-stone-500">
                    {formatMoney(row.renewalRevenueCents)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {row.newCustomersCount}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">
                  {row.activeSubscribersEnd}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-white/10 bg-stone-950/60 font-medium text-stone-100">
            <tr>
              <td className="px-3 py-3">Totais / último mês</td>
              <td className="px-3 py-3 text-right font-mono tabular-nums">
                {formatMoney(report.totals.totalRevenueCents)}
              </td>
              <td className="px-3 py-3 text-right font-mono tabular-nums">
                {report.totals.newSalesCount}
              </td>
              <td className="px-3 py-3 text-right font-mono tabular-nums">
                {report.totals.subscriptionNewCount}
              </td>
              <td className="px-3 py-3 text-right font-mono tabular-nums">
                {report.totals.storeNewCount}
              </td>
              <td className="px-3 py-3 text-right font-mono tabular-nums">
                {report.totals.renewalCount}
              </td>
              <td className="px-3 py-3 text-right font-mono tabular-nums">
                {report.totals.newCustomersCount}
              </td>
              <td className="px-3 py-3 text-right font-mono tabular-nums">
                {report.totals.activeSubscribersEnd}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
