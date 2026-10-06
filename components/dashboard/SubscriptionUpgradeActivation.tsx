'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import PagarmePaymentForm from '@/components/checkout/PagarmePaymentForm';
import CheckoutPixPaymentPanel from '@/components/checkout/CheckoutPixPaymentPanel';
import type { StorePixDetails } from '@/components/store/StorePixPaymentPanel';
import { formatMoney } from '@/lib/dashboard/format';

interface Props {
  subscriptionId: string;
  currentPlanName: string;
  targetPlanName: string;
  amountCents: number;
  promoSummary?: string | null;
}

export default function SubscriptionUpgradeActivation({
  subscriptionId,
  currentPlanName,
  targetPlanName,
  amountCents,
  promoSummary,
}: Props) {
  const router = useRouter();
  const [method, setMethod] = useState<'pix' | 'credit_card'>('pix');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [pix, setPix] = useState<StorePixDetails | null>(null);

  async function startPix() {
    setPending(true);
    setError('');
    try {
      const res = await fetch('/api/subscriptions/upgrade-activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, method: 'pix' }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof payload.error === 'string'
            ? payload.error
            : 'Não foi possível gerar o PIX.'
        );
      }
      if (payload.alreadyPaid) {
        router.refresh();
        return;
      }
      if (!payload.pix?.payload) {
        throw new Error('Não foi possível gerar o QR Code PIX.');
      }
      setPix(payload.pix as StorePixDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar o PIX.');
    } finally {
      setPending(false);
    }
  }

  async function payCard(card: { token: string }) {
    setError('');
    const res = await fetch('/api/subscriptions/upgrade-activation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionId,
        method: 'credit_card',
        cardToken: card.token,
      }),
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
        {promoSummary ? ` (${promoSummary.toLowerCase()})` : ''}. A assinatura continua
        em atraso até essa confirmação.
      </p>

      {pix ? (
        <div className="mt-5">
          <CheckoutPixPaymentPanel
            subscriptionId={subscriptionId}
            amountCents={amountCents}
            pix={pix}
            statusUrl={`/api/subscriptions/upgrade-activation?subscriptionId=${encodeURIComponent(subscriptionId)}`}
            onConfirmed={() => router.refresh()}
          />
        </div>
      ) : (
        <>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setMethod('pix')}
              className={`flex-1 cursor-pointer rounded-sm border px-4 py-3 font-display text-[10px] uppercase tracking-widest transition ${
                method === 'pix'
                  ? 'border-ember/40 bg-ember/10 text-ember'
                  : 'border-white/10 text-stone-300 hover:border-white/20'
              }`}
            >
              PIX
            </button>
            <button
              type="button"
              onClick={() => setMethod('credit_card')}
              className={`flex-1 cursor-pointer rounded-sm border px-4 py-3 font-display text-[10px] uppercase tracking-widest transition ${
                method === 'credit_card'
                  ? 'border-ember/40 bg-ember/10 text-ember'
                  : 'border-white/10 text-stone-300 hover:border-white/20'
              }`}
            >
              Cartão
            </button>
          </div>

          <div className="mt-4">
            {method === 'pix' ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => void startPix()}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-sm bg-ember px-5 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright disabled:opacity-50"
              >
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Gerando PIX…
                  </>
                ) : (
                  'Pagar com PIX'
                )}
              </button>
            ) : (
              <PagarmePaymentForm
                submitLabel="Pagar e ativar upgrade"
                onSubmit={payCard}
                onError={setError}
              />
            )}
          </div>
        </>
      )}

      {error ? (
        <p className="mt-3 text-sm text-red-200" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
