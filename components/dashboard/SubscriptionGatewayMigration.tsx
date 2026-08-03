'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import PagarmePaymentForm from '@/components/checkout/PagarmePaymentForm';

interface Props {
  subscriptionId: string;
  planName: string;
  nextBillingDate: string | null;
}

export default function SubscriptionGatewayMigration({
  subscriptionId,
  planName,
  nextBillingDate,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const billingLabel = nextBillingDate
    ? new Date(nextBillingDate).toLocaleDateString('pt-BR')
    : null;

  if (success) {
    return (
      <div
        className="rounded-sm border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100"
        role="status"
      >
        <p className="font-display text-xs uppercase tracking-widest text-emerald-200">
          Pagamento atualizado
        </p>
        <p className="mt-2">
          Sua assinatura <span className="text-white">{planName}</span> agora
          está no Pagar.me. Plano e benefícios permanecem os mesmos
          {billingLabel ? (
            <>
              ; a próxima cobrança segue em{' '}
              <span className="text-white">{billingLabel}</span>
            </>
          ) : null}
          .
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-ember/40 bg-ember/10 p-4">
      <p className="font-display text-xs uppercase tracking-widest text-ember-bright">
        Atualize seu pagamento
      </p>
      <p className="mt-2 text-sm text-stone-300">
        Estamos migrando cobranças para o Pagar.me. Cadastre o cartão aqui para
        continuar a assinatura <span className="text-white">{planName}</span>
        {billingLabel ? (
          <>
            . A cobrança só acontece em{' '}
            <span className="text-white">{billingLabel}</span> — atualizar agora
            não gera cobrança antecipada
          </>
        ) : null}
        . Leva menos de 2 minutos.
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setError('');
          }}
          className="mt-4 inline-flex min-h-[44px] items-center rounded-sm bg-ember px-4 py-2 font-display text-xs uppercase tracking-widest text-stone-950 hover:bg-ember-bright"
        >
          Atualizar cartão agora
        </button>
      ) : (
        <div className="mt-4 border-t border-white/10 pt-4">
          <PagarmePaymentForm
            submitLabel="Confirmar e migrar"
            onSubmit={async (tokenized) => {
              setError('');
              const response = await fetch(
                '/api/subscriptions/migrate-gateway',
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    subscriptionId,
                    cardToken: tokenized.token,
                    cardLast4: tokenized.last4,
                    cardBrand: tokenized.brand,
                  }),
                }
              );
              const payload = (await response.json().catch(() => ({}))) as {
                error?: string;
              };
              if (!response.ok) {
                setError(
                  payload.error ?? 'Não foi possível migrar o pagamento.'
                );
                return;
              }
              setSuccess(true);
              setOpen(false);
              router.refresh();
            }}
            onError={setError}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 text-sm text-stone-500 hover:text-stone-300"
          >
            Cancelar
          </button>
        </div>
      )}

      {error ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
