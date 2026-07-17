'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AsaasPaymentForm, {
  type AsaasCardPayload,
} from '@/components/checkout/AsaasPaymentForm';
import StatusBadge from '@/components/dashboard/StatusBadge';
import type { SubscriptionStatus } from '@/lib/dashboard/types';

export type CardUpdateSubscription = {
  id: string;
  planName: string;
  status: SubscriptionStatus;
  cardLast4: string | null;
  cardBrand: string | null;
};

interface Props {
  subscriptions: CardUpdateSubscription[];
}

export default function SubscriptionCardUpdate({ subscriptions }: Props) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(
    subscriptions.length === 1 ? subscriptions[0]?.id ?? null : null
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (subscriptions.length === 0) return null;

  async function handleSubmit(subscriptionId: string, card: AsaasCardPayload) {
    setMessage('');
    setError('');

    const response = await fetch('/api/subscriptions/payment-method', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionId, creditCard: card }),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(payload.error ?? 'Não foi possível atualizar o cartão.');
      return;
    }

    setMessage('Cartão atualizado com sucesso. As próximas cobranças usarão este cartão.');
    setOpenId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {subscriptions.map((subscription) => {
        const isOpen = openId === subscription.id;
        const cardLabel =
          subscription.cardBrand && subscription.cardLast4
            ? `${subscription.cardBrand} •••• ${subscription.cardLast4}`
            : 'Cartão de crédito cadastrado';

        return (
          <div
            key={subscription.id}
            className="rounded-sm border border-white/[0.08] bg-stone-950/40 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg uppercase tracking-wide text-white">
                  {subscription.planName}
                </p>
                <p className="mt-1 text-sm text-stone-400">{cardLabel}</p>
              </div>
              <StatusBadge kind="subscription" status={subscription.status} />
            </div>

            {!isOpen ? (
              <button
                type="button"
                onClick={() => {
                  setOpenId(subscription.id);
                  setMessage('');
                  setError('');
                }}
                className="mt-4 inline-flex min-h-[44px] items-center font-display text-xs uppercase tracking-widest text-ember hover:text-ember-bright"
              >
                Trocar cartão
              </button>
            ) : (
              <div className="mt-5 border-t border-white/[0.06] pt-5">
                <p className="mb-4 text-sm text-stone-400">
                  Informe o novo cartão. A troca não gera cobrança imediata — as
                  próximas faturas e cobranças pendentes passam a usar este cartão.
                </p>
                <AsaasPaymentForm
                  submitLabel="Salvar novo cartão"
                  onSubmit={(card) => handleSubmit(subscription.id, card)}
                  onError={setError}
                />
                <button
                  type="button"
                  onClick={() => setOpenId(null)}
                  className="mt-4 text-sm text-stone-500 hover:text-stone-300"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        );
      })}

      {message ? (
        <p className="rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}
    </div>
  );
}
