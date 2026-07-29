'use client';

import { useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { setCycleProductionMonthAction } from '@/lib/admin/actions';
import { monthKeyFromDate } from '@/lib/admin/chart-period';
import {
  defaultProductionMonthKey,
  mapRawMonthToProductionMonth,
  productionMonthLabel,
} from '@/lib/admin/production-month';
import { addMonthsToMonthKey } from '@/lib/subscriptions/monthly-production-schedule';

const QUICK_MONTH_SLOTS = 6;

interface Props {
  cycleId: string;
  cycleNumber: number;
  productionMonthKey: string | null;
  paidAt: string | null;
  onSuccess?: () => void;
}

function anchorMonthFromPayment(paidAt: string | null): string {
  if (paidAt) {
    return mapRawMonthToProductionMonth(monthKeyFromDate(new Date(paidAt)));
  }
  return defaultProductionMonthKey();
}

export default function CycleProductionMonthQuickSet({
  cycleId,
  cycleNumber,
  productionMonthKey,
  paidAt,
  onSuccess,
}: Props) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const anchorMonth = useMemo(
    () => anchorMonthFromPayment(paidAt),
    [paidAt]
  );

  const monthOptions = useMemo(
    () =>
      Array.from({ length: QUICK_MONTH_SLOTS }, (_, index) => ({
        slot: index + 1,
        monthKey: addMonthsToMonthKey(anchorMonth, index),
      })),
    [anchorMonth]
  );

  async function applyProductionMonth(monthKey: string) {
    setPendingKey(monthKey);
    setError('');
    setMessage('');

    const result = await setCycleProductionMonthAction(cycleId, monthKey);

    setPendingKey(null);

    if ('error' in result && result.error) {
      if (result.error === 'Nenhuma alteração para salvar.') {
        setMessage('Este mês já está selecionado.');
        return;
      }
      setError(result.error);
      return;
    }

    setMessage('Mês de produção atualizado.');
    onSuccess?.();
  }

  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        Ciclo #{cycleNumber} · altera só o mês no kanban
      </p>

      <div className="flex flex-wrap gap-2">
        {monthOptions.map((option) => {
          const isActive = productionMonthKey === option.monthKey;
          const isPending = pendingKey === option.monthKey;

          return (
            <button
              key={option.slot}
              type="button"
              disabled={Boolean(pendingKey)}
              onClick={() => void applyProductionMonth(option.monthKey)}
              className={`inline-flex min-w-[7.5rem] cursor-pointer flex-col items-start rounded border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isActive
                  ? 'border-console/50 bg-console/15 text-console'
                  : 'border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900'
              }`}
            >
              <span className="flex w-full items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
                Mês {option.slot}
                {isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : isActive ? (
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                ) : null}
              </span>
              <span className="mt-1 text-xs text-zinc-400">
                {productionMonthLabel(option.monthKey)}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-zinc-500">
        Mês 1 ={' '}
        <span className="text-zinc-400">{productionMonthLabel(anchorMonth)}</span>
        {paidAt ? ' (referência do pagamento)' : ''}. O número do ciclo (#{cycleNumber})
        não muda — use o agendamento manual abaixo para isso.
      </p>

      {error ? (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-300" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
