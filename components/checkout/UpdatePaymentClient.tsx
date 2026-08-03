'use client';

import { useState } from 'react';
import PagarmePaymentForm from '@/components/checkout/PagarmePaymentForm';

interface Props {
  token: string | null;
}

export default function UpdatePaymentClient({ token }: Props) {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!token) {
    return (
      <p className="text-sm text-red-300">
        Link inválido. Solicite um novo e-mail de atualização.
      </p>
    );
  }

  if (success) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-2xl uppercase tracking-wide text-white">
          Cartão atualizado com sucesso
        </h1>
        <p className="text-stone-400">
          Sua assinatura DungeonBox continua ativa na nova plataforma. A próxima
          cobrança segue na data original do seu ciclo — atualizar o cartão não
          gera cobrança antecipada.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-wide text-white">
          Atualizar método de pagamento
        </h1>
        <p className="mt-2 text-sm text-stone-400">
          Insira seu cartão para continuar sua assinatura na nova plataforma.
          Não há cobrança agora — o valor segue na data de vencimento do seu
          ciclo.
        </p>
      </div>
      <PagarmePaymentForm
        submitLabel="Atualizar cartão"
        onSubmit={async (tokenized) => {
          setError('');
          const res = await fetch('/api/subscriptions/migrate-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              updateToken: token,
              cardToken: tokenized.token,
              cardLast4: tokenized.last4,
              cardBrand: tokenized.brand,
            }),
          });
          const payload = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError(
              typeof payload.error === 'string'
                ? payload.error
                : 'Não foi possível atualizar o cartão.'
            );
            return;
          }
          setSuccess(true);
        }}
        onError={setError}
      />
      {error ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
