'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { syncPagarmeRecurringPriceAction } from '@/lib/admin/actions';
import { formatMoney } from '@/lib/dashboard/format';

interface Props {
  subscriptionId: string;
  promoCode?: string | null;
}

export default function SyncPagarmeRecurringPriceButton({
  subscriptionId,
  promoCode,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(
              promoCode
                ? `Atualizar o valor no Pagar.me aplicando o cupom ${promoCode}?`
                : 'Atualizar o valor no Pagar.me com o preço recorrente local (plano + frete − cupom)?'
            )
          ) {
            return;
          }

          setMessage('');
          setError('');
          startTransition(async () => {
            const response = await syncPagarmeRecurringPriceAction(
              subscriptionId
            );
            if ('error' in response && response.error) {
              setError(response.error);
              return;
            }
            if (!('success' in response) || !response.success) return;

            const result = response.result;
            if (result.status === 'already_aligned') {
              setMessage(
                `Já alinhado em ${formatMoney(result.expectedCents)}${
                  result.promoCode ? ` · cupom ${result.promoCode}` : ''
                }`
              );
            } else {
              setMessage(
                `Atualizado ${formatMoney(result.previousCents)} → ${formatMoney(result.expectedCents)}${
                  result.promoCode ? ` · cupom ${result.promoCode}` : ''
                }${result.promoSummary ? ` (${result.promoSummary})` : ''}`
              );
            }
            router.refresh();
          });
        }}
        className="cursor-pointer rounded-sm border border-gold/40 bg-gold/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-gold transition hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Corrigindo…' : 'Corrigir valor Pagar.me'}
      </button>
      <p className="max-w-sm text-xs text-stone-500">
        Recalcula plano + frete + adicionais com cupom local e atualiza o item
        da assinatura no Pagar.me.
      </p>
      {message ? (
        <p className="font-mono text-[11px] text-emerald-300" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="font-mono text-[11px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
