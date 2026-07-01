'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { syncSubscriptionCyclesAction } from '@/lib/admin/actions';

export default function SyncCyclesButton() {
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

          void syncSubscriptionCyclesAction().then((result) => {
            setPending(false);
            if (!result.success) {
              setError('Falha ao sincronizar ciclos.');
              return;
            }
              const parts = [
                result.removed > 0
                  ? `${result.removed} duplicata(s) removida(s)`
                  : null,
                result.created > 0
                  ? `${result.created} ciclo(s) criado(s) em aguardando`
                  : null,
                result.countersFixed > 0
                  ? `${result.countersFixed} contador(es) de ciclo corrigido(s)`
                  : null,
                result.subscriptionCountersFixed > 0
                  ? `${result.subscriptionCountersFixed} assinatura(s) com contador ajustado`
                  : null,
              ].filter(Boolean);

              setMessage(
                parts.length > 0
                  ? `${parts.join(' · ')}. Status dos pedidos não foi alterado.`
                  : 'Nada a consolidar. Status dos pedidos não foi alterado.'
              );
              router.refresh();
          });
        }}
        className="cursor-pointer rounded border border-console/30 bg-console/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-console transition hover:bg-console/15 disabled:opacity-50"
      >
        {pending ? 'Sincronizando…' : 'Sincronizar ciclos'}
      </button>
      {error ? (
        <p className="max-w-md font-mono text-[11px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="max-w-md font-mono text-[11px] text-emerald-300" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
