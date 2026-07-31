'use client';

import { useState, useTransition } from 'react';
import { switchGatewayAction } from '@/lib/admin/actions';

interface Props {
  activeGateway: 'asaas' | 'pagarme';
  asaasConfigured: boolean;
  pagarmeConfigured: boolean;
}

export default function AdminGatewayConfigClient({
  activeGateway,
  asaasConfigured,
  pagarmeConfigured,
}: Props) {
  const [gateway, setGateway] = useState(activeGateway);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function handleSwitch(next: 'asaas' | 'pagarme') {
    setMessage('');
    setError('');
    startTransition(async () => {
      const result = await switchGatewayAction(next);
      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }
      setGateway(next);
      setMessage('Gateway atualizado para novos checkouts.');
    });
  }

  return (
    <div className="admin-panel max-w-2xl space-y-6 rounded p-6">
      <p className="text-sm text-stone-400">
        Gateway ativo para novos assinantes. Assinantes existentes não são
        afetados — cada assinatura continua no gateway em que foi criada.
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending || !asaasConfigured || gateway === 'asaas'}
          onClick={() => handleSwitch('asaas')}
          className={`rounded-sm border px-4 py-3 font-display text-xs uppercase tracking-widest transition ${
            gateway === 'asaas'
              ? 'border-ember/50 bg-ember/15 text-ember'
              : 'border-white/15 text-stone-300 hover:border-white/30'
          } disabled:opacity-50`}
        >
          Asaas
        </button>
        <button
          type="button"
          disabled={pending || !pagarmeConfigured || gateway === 'pagarme'}
          onClick={() => handleSwitch('pagarme')}
          className={`rounded-sm border px-4 py-3 font-display text-xs uppercase tracking-widest transition ${
            gateway === 'pagarme'
              ? 'border-ember/50 bg-ember/15 text-ember'
              : 'border-white/15 text-stone-300 hover:border-white/30'
          } disabled:opacity-50`}
        >
          Pagar.me
        </button>
      </div>

      <ul className="space-y-2 text-xs text-stone-500">
        <li>Asaas: {asaasConfigured ? 'configurado' : 'não configurado'}</li>
        <li>Pagar.me: {pagarmeConfigured ? 'configurado' : 'não configurado'}</li>
      </ul>

      {message ? (
        <p className="text-sm text-emerald-300" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
