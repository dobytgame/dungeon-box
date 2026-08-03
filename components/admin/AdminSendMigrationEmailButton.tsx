'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { sendGatewayMigrationEmailAction } from '@/lib/admin/actions';

interface Props {
  subscriptionId: string;
  disabled?: boolean;
}

export default function AdminSendMigrationEmailButton({
  subscriptionId,
  disabled,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  return (
    <div className="space-y-1">
      <button
        type="button"
        disabled={disabled || pending}
        onClick={() => {
          setMessage('');
          setError('');
          startTransition(async () => {
            const result = await sendGatewayMigrationEmailAction({
              subscriptionId,
            });
            if ('error' in result && result.error) {
              setError(result.error);
              return;
            }
            if ('success' in result && result.success) {
              setMessage(`Enviado${result.email ? ` · ${result.email}` : ''}`);
              router.refresh();
            }
          });
        }}
        className="rounded-sm border border-console/40 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-console transition hover:bg-console/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {pending ? 'Enviando…' : 'Enviar e-mail'}
      </button>
      {message ? (
        <p className="font-mono text-[10px] text-emerald-400">{message}</p>
      ) : null}
      {error ? (
        <p className="font-mono text-[10px] text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
