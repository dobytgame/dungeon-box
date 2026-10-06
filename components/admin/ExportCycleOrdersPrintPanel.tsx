'use client';

import { useState } from 'react';

export type CyclePrintOption = {
  cycleNumber: number;
  label: string;
  count: number;
  hasOpenWork: boolean;
};

interface Props {
  cycles: CyclePrintOption[];
  defaultCycleNumber: number;
}

function cycleOrdersPrintReportUrl(cycleNumber: number): string {
  return `/api/admin/reports/cycle-orders?ciclo=${encodeURIComponent(String(cycleNumber))}`;
}

export default function ExportCycleOrdersPrintPanel({
  cycles,
  defaultCycleNumber,
}: Props) {
  const safeCycles =
    cycles.length > 0
      ? cycles
      : [{ cycleNumber: 1, label: 'Ciclo 1', count: 0, hasOpenWork: false }];

  const initialCycle = safeCycles.some((c) => c.cycleNumber === defaultCycleNumber)
    ? defaultCycleNumber
    : safeCycles[0]!.cycleNumber;

  const [cycleNumber, setCycleNumber] = useState(initialCycle);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  return (
    <div className="space-y-2 rounded-sm border border-white/[0.06] bg-stone-950/40 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="font-display text-sm uppercase tracking-wide text-white">
            Relatório de pedidos por ciclo (impressão)
          </p>
          <p className="mt-1 text-sm text-stone-500">
            Gera uma folha <strong className="font-medium text-stone-300">A4 paisagem</strong>{' '}
            com pedidos do ciclo escolhido, ordenados por atraso na produção (dias úteis).
            Inclui etapa (aguardando → embalado), nome, e-mail, data da compra, plano e faixa de
            cor conforme o prazo de 15 dias úteis. Não inclui coleta, enviados nem entregues.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
              Ciclo
            </span>
            <select
              id="cycle-print-export"
              name="cycleNumber"
              value={String(cycleNumber)}
              onChange={(event) => {
                const next = Number.parseInt(event.target.value, 10);
                if (Number.isInteger(next) && next > 0) {
                  setCycleNumber(next);
                }
              }}
              className="mt-1 block min-w-[10rem] cursor-pointer rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
            >
              {safeCycles.map((item) => (
                <option key={item.cycleNumber} value={String(item.cycleNumber)}>
                  {item.label}
                  {item.count > 0 ? ` (${item.count})` : ''}
                  {item.hasOpenWork ? ' · em aberto' : ''}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setError('');
              setMessage('');
              const url = cycleOrdersPrintReportUrl(cycleNumber);
              const printWindow = window.open(url, '_blank');
              if (!printWindow) {
                setError(
                  'O navegador bloqueou a nova aba. Permita pop-ups para este site ou abra o link manualmente.'
                );
                return;
              }
              setMessage(
                'Relatório aberto em nova aba. Use Imprimir ou Salvar como PDF quando a página carregar.'
              );
            }}
            className="cursor-pointer shrink-0 rounded-sm border border-console/40 bg-console/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-console transition hover:bg-console/20 disabled:opacity-50"
          >
            Abrir para imprimir
          </button>
        </div>
      </div>
      {error ? (
        <p className="font-mono text-[11px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="font-mono text-[11px] text-emerald-300" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
