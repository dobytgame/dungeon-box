'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { changePagarmeBillingDayAction } from '@/lib/admin/actions';
import { formatDate, formatMoney } from '@/lib/dashboard/format';
import {
  extractBillingDay,
  resolveBillingDayAfterCatchUpCharge,
  resolveNextBillingDateForDay,
} from '@/lib/pagarme/billing-day';

interface Props {
  subscriptionId: string;
  nextBillingDate: string | null;
  subscriptionStatus: string;
}

export default function ChangePagarmeBillingDayPanel({
  subscriptionId,
  nextBillingDate,
  subscriptionStatus,
}: Props) {
  const router = useRouter();
  const currentDay = extractBillingDay(nextBillingDate) ?? 5;
  const [billingDay, setBillingDay] = useState(String(currentDay));
  const overdueDefault =
    subscriptionStatus === 'past_due' ||
    (nextBillingDate
      ? new Date(
          nextBillingDate.includes('T')
            ? nextBillingDate
            : `${nextBillingDate}T12:00:00`
        ).getTime() < Date.now()
      : false);
  const [chargeOverdue, setChargeOverdue] = useState(overdueDefault);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const previewDate = useMemo(() => {
    const day = Number(billingDay);
    if (!Number.isFinite(day) || day < 1 || day > 28) return null;
    return chargeOverdue
      ? resolveBillingDayAfterCatchUpCharge(day)
      : resolveNextBillingDateForDay(day);
  }, [billingDay, chargeOverdue]);

  return (
    <section className="rounded-sm border border-frost/25 bg-frost/[0.04] p-5 md:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-frost/80">
        Pagar.me · vencimento
      </p>
      <h3 className="mt-2 font-display text-lg uppercase tracking-wide text-white">
        Alterar dia da cobrança
      </h3>
      <p className="mt-2 max-w-2xl text-sm text-stone-400">
        Ex.: mudar de todo dia {String(currentDay).padStart(2, '0')} para dia 07.
        Se houver atraso, cobra agora e agenda a próxima renovação no novo dia.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            Novo dia (1–28)
          </span>
          <input
            type="number"
            min={1}
            max={28}
            value={billingDay}
            onChange={(event) => setBillingDay(event.target.value)}
            className="mt-1 block w-24 rounded-sm border border-white/10 bg-stone-950 px-3 py-2 font-mono text-sm text-white"
          />
        </label>

        <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-stone-300">
          <input
            type="checkbox"
            checked={chargeOverdue}
            onChange={(event) => setChargeOverdue(event.target.checked)}
            className="h-4 w-4 cursor-pointer accent-ember"
          />
          Cobrar atraso agora e remarcar próxima
        </label>
      </div>

      {previewDate ? (
        <p className="mt-3 text-xs text-stone-500">
          {chargeOverdue ? 'Após a cobrança, próxima data: ' : 'Próxima data: '}
          <span className="text-stone-300">
            {formatDate(previewDate.toISOString())}
          </span>
          {nextBillingDate ? (
            <>
              {' '}
              (atual: {formatDate(nextBillingDate)})
            </>
          ) : null}
        </p>
      ) : null}

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          const day = Number(billingDay);
          if (!Number.isFinite(day) || day < 1 || day > 28) {
            setError('Informe um dia entre 1 e 28.');
            return;
          }

          const confirmMsg = chargeOverdue
            ? `Cobrar o atraso agora e alterar o vencimento para todo dia ${String(day).padStart(2, '0')}?`
            : `Alterar o vencimento para todo dia ${String(day).padStart(2, '0')} sem cobrar agora?`;

          if (!window.confirm(confirmMsg)) return;

          setMessage('');
          setError('');
          startTransition(async () => {
            const response = await changePagarmeBillingDayAction({
              subscriptionId,
              billingDay: day,
              chargeOverdue,
            });
            if ('error' in response && response.error) {
              setError(response.error);
              return;
            }
            if (!('success' in response) || !response.success) return;

            const result = response.result;
            const parts = [
              result.message,
              `Próxima: ${formatDate(result.nextBillingDate)}`,
            ];
            if (result.chargedOverdue && result.chargeAmountCents != null) {
              parts.push(`Cobrado ${formatMoney(result.chargeAmountCents)}`);
            }
            setMessage(parts.join(' · '));
            router.refresh();
          });
        }}
        className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center rounded-sm border border-frost/40 bg-frost/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-frost transition hover:bg-frost/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Atualizando…' : 'Salvar novo dia'}
      </button>

      {message ? (
        <p className="mt-3 font-mono text-[11px] text-emerald-300" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 font-mono text-[11px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
