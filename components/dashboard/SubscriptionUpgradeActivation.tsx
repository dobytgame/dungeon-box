'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { formatMoney } from '@/lib/dashboard/format';

interface Props {
  subscriptionId: string;
  currentPlanName: string;
  targetPlanName: string;
  amountCents: number;
  promoSummary?: string | null;
  cardBrand?: string | null;
  cardLast4?: string | null;
}

function linkedCardLabel(brand?: string | null, last4?: string | null): string | null {
  const digits = last4?.trim();
  if (!digits) return null;
  const name = brand?.trim();
  return name ? `${name} •••• ${digits}` : `•••• ${digits}`;
}

export default function SubscriptionUpgradeActivation({
  subscriptionId,
  currentPlanName,
  targetPlanName,
  amountCents,
  promoSummary,
  cardBrand,
  cardLast4,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const cardLabel = linkedCardLabel(cardBrand, cardLast4);

  async function pay() {
    setPending(true);
    setError('');
    try {
      const res = await fetch('/api/subscriptions/upgrade-activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof payload.error === 'string'
            ? payload.error
            : 'Não foi possível confirmar o pagamento.'
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cobrar o cartão.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className="rounded-sm border border-amber-400/30 bg-amber-500/10 p-4 md:p-5"
      role="alert"
    >
      <p className="font-display text-xs uppercase tracking-widest text-amber-100">
        Pagamento para ativar o upgrade
      </p>
      <p className="mt-2 text-sm leading-relaxed text-amber-50/90">
        O upgrade de <strong className="text-white">{currentPlanName}</strong> para{' '}
        <strong className="text-white">{targetPlanName}</strong> só entra depois do
        pagamento de <strong className="text-white">{formatMoney(amountCents)}</strong>
        {promoSummary ? ` (${promoSummary.toLowerCase()})` : ''} no cartão já vinculado
        à assinatura
        {cardLabel ? (
          <>
            : <strong className="text-white">{cardLabel}</strong>
          </>
        ) : null}
        . A assinatura continua em atraso até essa confirmação.
      </p>

      <button
        type="button"
        disabled={pending}
        onClick={() => void pay()}
        className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-sm bg-ember px-5 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright disabled:opacity-50"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Cobrando cartão…
          </>
        ) : (
          'Pagar e ativar upgrade'
        )}
      </button>

      {error ? (
        <p className="mt-3 text-sm text-red-200" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
