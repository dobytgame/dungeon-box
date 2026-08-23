'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { chargePagarmeSubscriptionNowAction } from '@/lib/admin/actions';
import { formatMoney } from '@/lib/dashboard/format';

interface Props {
  subscriptionId: string;
  expectedAmountCents?: number | null;
}

export default function ChargePagarmeNowButton({
  subscriptionId,
  expectedAmountCents = null,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const amountHint =
    expectedAmountCents != null && expectedAmountCents > 0
      ? ` (~${formatMoney(expectedAmountCents)})`
      : '';

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(
              `Disparar cobrança agora no cartão do cliente no Pagar.me${amountHint}?\n\n` +
                'Se existir fatura falha/pendente, reprocessa. Senão, renova o ciclo e cobra.\n' +
                'Isso gera uma cobrança real.'
            )
          ) {
            return;
          }

          setMessage('');
          setError('');
          startTransition(async () => {
            const response = await chargePagarmeSubscriptionNowAction(
              subscriptionId
            );
            if ('error' in response && response.error) {
              setError(response.error);
              return;
            }
            if (!('success' in response) || !response.success) return;

            const result = response.result;
            const amountLabel =
              result.amountCents != null
                ? formatMoney(result.amountCents)
                : formatMoney(result.expectedCents);
            const modeLabel =
              result.mode === 'retry'
                ? 'reprocessamento'
                : result.mode === 'catchup'
                  ? 'regularização (assinatura futura)'
                  : 'renovação de ciclo';

            if (result.status === 'charged') {
              setMessage(
                `Cobrado ${amountLabel} (${modeLabel})${
                  result.promoSummary ? ` · ${result.promoSummary}` : ''
                }`
              );
            } else {
              setMessage(
                `Cobrança enviada (${modeLabel}) · ${amountLabel}. ${result.message}`
              );
            }
            router.refresh();
          });
        }}
        className="cursor-pointer rounded-sm border border-ember/40 bg-ember/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-ember-bright transition hover:bg-ember/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Cobrando…' : 'Cobrar agora (Pagar.me)'}
      </button>
      <p className="max-w-sm text-xs text-stone-500">
        Para atraso ou falha: tenta reprocessar a fatura; se não houver, renova o
        ciclo e cobra no cartão cadastrado.
      </p>
      {message ? (
        <p className="max-w-sm font-mono text-[11px] text-emerald-300" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="max-w-sm font-mono text-[11px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
