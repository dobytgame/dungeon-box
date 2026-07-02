'use client';

import { operationChartPeriodLabel } from '@/lib/admin/chart-period';
import { formatMoney } from '@/lib/dashboard/format';

interface MonthRow {
  month: string;
  label: string;
  inflowCents: number;
  outflowCents: number;
  netCents: number;
}

interface Props {
  rows: MonthRow[];
}

export default function AdminCashFlowChart({ rows }: Props) {
  const maxValue = Math.max(
    ...rows.flatMap((row) => [row.inflowCents, row.outflowCents, Math.abs(row.netCents)]),
    1
  );

  return (
    <div className="admin-panel rounded p-5 md:p-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          Fluxo de caixa
        </p>
        <h3 className="mt-2 text-lg font-medium text-zinc-100">
          Desde {operationChartPeriodLabel()}
        </h3>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-500">
          Entradas de pedidos aprovados vs saídas (gastos pagos e reembolsos).
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 font-mono text-xs text-zinc-600">Sem dados no período.</p>
      ) : (
        <div className="mt-6 space-y-5">
          {rows.map((row) => {
            const inflowPct = (row.inflowCents / maxValue) * 100;
            const outflowPct = (row.outflowCents / maxValue) * 100;

            return (
              <div key={row.month}>
                <div className="mb-2 flex items-end justify-between gap-3">
                  <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-400">
                    {row.label}
                  </p>
                  <p
                    className={`font-mono text-sm tabular-nums ${
                      row.netCents >= 0 ? 'text-console' : 'text-red-300'
                    }`}
                  >
                    {formatMoney(row.netCents)}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-14 shrink-0 font-mono text-[10px] text-zinc-600">
                      Entrada
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-900">
                      <div
                        className="h-full rounded-full bg-console/80"
                        style={{ width: `${inflowPct}%` }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right font-mono text-[10px] tabular-nums text-zinc-500">
                      {formatMoney(row.inflowCents)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-14 shrink-0 font-mono text-[10px] text-zinc-600">
                      Saída
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-900">
                      <div
                        className="h-full rounded-full bg-red-400/70"
                        style={{ width: `${outflowPct}%` }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right font-mono text-[10px] tabular-nums text-zinc-500">
                      {formatMoney(row.outflowCents)}
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
