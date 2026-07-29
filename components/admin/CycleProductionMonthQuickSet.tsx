'use client';

import { useMemo, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { updateCycleScheduleAction } from '@/lib/admin/actions';
import { monthKeyFromDate } from '@/lib/admin/chart-period';
import {
  defaultProductionMonthKey,
  mapRawMonthToProductionMonth,
  productionMonthLabel,
} from '@/lib/admin/production-month';
import { addMonthsToMonthKey } from '@/lib/subscriptions/monthly-production-schedule';

const QUICK_KIT_SLOTS = 6;

interface Props {
  cycleId: string;
  cycleNumber: number;
  productionMonthKey: string | null;
  paidAt: string | null;
  onSuccess?: () => void;
}

function anchorMonthFromPayment(
  paidAt: string | null,
  currentKey: string | null
): string {
  if (paidAt) {
    return mapRawMonthToProductionMonth(monthKeyFromDate(new Date(paidAt)));
  }
  if (currentKey) return currentKey;
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
    () => anchorMonthFromPayment(paidAt, productionMonthKey),
    [paidAt, productionMonthKey]
  );

  const kitOptions = useMemo(
    () =>
      Array.from({ length: QUICK_KIT_SLOTS }, (_, index) => {
        const kitNumber = index + 1;
        return {
          kitNumber,
          monthKey: addMonthsToMonthKey(anchorMonth, index),
        };
      }),
    [anchorMonth]
  );

  async function applySchedule(monthKey: string, nextCycleNumber: number) {
    setPendingKey(`${monthKey}:${nextCycleNumber}`);
    setError('');
    setMessage('');

    const formData = new FormData();
    formData.set('cycle_number', String(nextCycleNumber));
    formData.set('production_month', monthKey);

    const result = await updateCycleScheduleAction(cycleId, formData);

    setPendingKey(null);

    if ('error' in result && result.error) {
      setError(result.error);
      return;
    }

    setMessage('Agendamento atualizado.');
    onSuccess?.();
  }

  const activeMonthKey = productionMonthKey;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {kitOptions.map((option) => {
          const isActive =
            activeMonthKey === option.monthKey &&
            cycleNumber === option.kitNumber;
          const isPending =
            pendingKey === `${option.monthKey}:${option.kitNumber}`;

          return (
            <button
              key={option.kitNumber}
              type="button"
              disabled={Boolean(pendingKey)}
              onClick={() =>
                void applySchedule(option.monthKey, option.kitNumber)
              }
              className={`inline-flex min-w-[7.5rem] cursor-pointer flex-col items-start rounded border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isActive
                  ? 'border-console/50 bg-console/15 text-console'
                  : 'border-zinc-800 bg-zinc-950/60 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900'
              }`}
            >
              <span className="flex w-full items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
                Kit {option.kitNumber}
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
        Referência do Kit 1:{' '}
        <span className="text-zinc-400">{productionMonthLabel(anchorMonth)}</span>
        {paidAt ? ' (mês do pagamento)' : ''}. Cada kit avança um mês de
        produção.
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
