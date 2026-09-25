'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { chargePagarmeSubscriptionNowAction } from '@/lib/admin/actions';
import { formatMoney } from '@/lib/dashboard/format';

interface Props {
  subscriptionId: string;
  expectedAmountCents?: number | null;
  variant?: 'default' | 'overdue';
}

function formatCardLabel(card?: {
  last4?: string | null;
  brand?: string | null;
  synced?: boolean;
} | null) {
  if (!card) return '';
  const brand = card.brand?.trim() || 'Cartão';
  const last4 = card.last4?.trim() ? `•••• ${card.last4.trim()}` : '';
  return [brand, last4].filter(Boolean).join(' ');
}

export default function ChargePagarmeNowButton({
  subscriptionId,
  expectedAmountCents = null,
  variant = 'default',
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const amountHint =
    expectedAmountCents != null && expectedAmountCents > 0
      ? ` (~${formatMoney(expectedAmountCents)})`
      : '';
  const isOverdue = variant === 'overdue';

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(
              isOverdue
                ? `Cobrar o atraso no cartão do cliente${amountHint}?\n\n` +
                    'O sistema confere se o cartão foi atualizado e dispara a cobrança no cartão mais recente da carteira. Isso gera uma cobrança real.'
                : `Disparar cobrança agora no cartão do cliente no Pagar.me${amountHint}?\n\n` +
                    'Confere se o cartão foi atualizado. Se existir fatura falha no mesmo cartão, reprocessa. Senão, cobra no cartão atual.\n' +
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
            const cardLabel = formatCardLabel(result.card);
            const cardNote = result.card?.synced
              ? ` Cartão atualizado e validado${cardLabel ? `: ${cardLabel}` : ''}.`
              : cardLabel
                ? ` Cartão confirmado: ${cardLabel}.`
                : '';

            if (result.status === 'charged') {
              setMessage(
                `Cobrado ${amountLabel} (${modeLabel})${
                  result.promoSummary ? ` · ${result.promoSummary}` : ''
                }.${cardNote}`
              );
            } else {
              setMessage(
                `Cobrança enviada (${modeLabel}) · ${amountLabel}. ${result.message}${cardNote}`
              );
            }
            router.refresh();
          });
        }}
        className="cursor-pointer rounded-sm border border-ember/40 bg-ember/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-ember-bright transition hover:bg-ember/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending
          ? 'Cobrando…'
          : isOverdue
            ? 'Cobrar atraso no cartão'
            : 'Cobrar agora (Pagar.me)'}
      </button>
      <p className="max-w-sm text-xs text-stone-500">
        {isOverdue
          ? 'Valida o cartão mais recente da carteira (se o cliente atualizou) e dispara a cobrança do atraso.'
          : 'Confere se o cartão foi atualizado. Se a fatura falha ainda for do mesmo cartão, reprocessa; senão, cobra no cartão atual.'}
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
