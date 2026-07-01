'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { syncAsaasSubscriptionAction } from '@/lib/admin/actions';

interface Props {
  subscriptionId: string;
}

export default function SyncAsaasButton({ subscriptionId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setPending(true);
          setError('');
          setMessage('');

          void syncAsaasSubscriptionAction(subscriptionId).then((result) => {
            setPending(false);
            if ('error' in result && result.error) {
              setError(result.error);
              return;
            }
            if ('success' in result && result.success) {
              const parts = [
                `Importadas ${result.upserted} de ${result.remoteCount} cobrança(s) do Asaas.`,
                result.reconciled
                  ? 'Assinatura pendente foi ativada com base no pagamento confirmado.'
                  : 'Status da assinatura não foi alterado.',
              ];
              setMessage(parts.join(' '));
              router.refresh();
            }
          });
        }}
        className="cursor-pointer rounded-sm border border-white/15 px-4 py-2 font-display text-xs uppercase tracking-widest text-stone-300 transition hover:border-white/30 hover:text-white disabled:opacity-50"
      >
        {pending ? 'Sincronizando…' : 'Sincronizar Asaas'}
      </button>
      {error ? (
        <p className="max-w-xs font-mono text-[11px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="max-w-xs font-mono text-[11px] text-emerald-300" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
