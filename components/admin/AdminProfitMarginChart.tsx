'use client';

import { operationChartPeriodLabel } from '@/lib/admin/chart-period';
import { formatMoney } from '@/lib/dashboard/format';

export interface ProfitMonthRow {
  month: string;
  label: string;
  salesCents: number;
  costCents: number;
  profitCents: number;
  marginPercent: number | null;
}

interface Props {
  rows: ProfitMonthRow[];
  title?: string;
  subtitle?: string;
}

function marginClass(margin: number | null): string {
  if (margin == null) return 'text-zinc-500';
  if (margin >= 30) return 'text-console';
  if (margin >= 10) return 'text-amber-300';
  return 'text-red-300';
}

export default function AdminProfitMarginChart({
  rows,
  title = 'Vendas × custo dos pedidos',
  subtitle = 'Vendas vs custo dos pedidos. Combos entram mês a mês conforme cada ciclo entra em produção; mensalidades contam no pagamento.',
}: Props) {
  const maxValue = Math.max(
    ...rows.flatMap((row) => [
      row.salesCents,
      row.costCents,
      Math.abs(row.profitCents),
    ]),
    1
  );

  return (
    <div className="admin-panel rounded p-5 md:p-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          Margem de produto
        </p>
        <h3 className="mt-2 text-lg font-medium text-zinc-100">
          {title} · desde {operationChartPeriodLabel()}
        </h3>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-500">{subtitle}</p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 font-mono text-xs text-zinc-600">Sem dados no período.</p>
      ) : (
        <div className="mt-6 space-y-5">
          {rows.map((row) => {
            const salesPct = (row.salesCents / maxValue) * 100;
            const costPct = (row.costCents / maxValue) * 100;
            const profitPct = (Math.abs(row.profitCents) / maxValue) * 100;

            return (
              <div key={row.month}>
                <div className="mb-2 flex items-end justify-between gap-3">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
                    {row.label}
                  </p>
                  <div className="text-right">
                    <p
                      className={`font-mono text-sm tabular-nums ${
                        row.profitCents >= 0 ? 'text-console' : 'text-red-300'
                      }`}
                    >
                      {formatMoney(row.profitCents)}
                    </p>
                    <p
                      className={`font-mono text-[10px] tabular-nums ${marginClass(row.marginPercent)}`}
                    >
                      {row.marginPercent != null ? `${row.marginPercent}% margem` : '—'}
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-14 shrink-0 font-mono text-[10px] text-zinc-600">
                      Vendas
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-900">
                      <div
                        className="h-full rounded-full bg-console/80"
                        style={{ width: `${salesPct}%` }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right font-mono text-[10px] tabular-nums text-zinc-500">
                      {formatMoney(row.salesCents)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-14 shrink-0 font-mono text-[10px] text-zinc-600">
                      Custos
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-900">
                      <div
                        className="h-full rounded-full bg-red-400/70"
                        style={{ width: `${costPct}%` }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right font-mono text-[10px] tabular-nums text-zinc-500">
                      {formatMoney(row.costCents)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-14 shrink-0 font-mono text-[10px] text-zinc-600">
                      Lucro
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-900">
                      <div
                        className={`h-full rounded-full ${
                          row.profitCents >= 0 ? 'bg-amber-400/80' : 'bg-red-500/80'
                        }`}
                        style={{ width: `${profitPct}%` }}
                      />
                    </div>
                    <span
                      className={`w-20 shrink-0 text-right font-mono text-[10px] tabular-nums ${
                        row.profitCents >= 0 ? 'text-amber-300' : 'text-red-300'
                      }`}
                    >
                      {formatMoney(row.profitCents)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
