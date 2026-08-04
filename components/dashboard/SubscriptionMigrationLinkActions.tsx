'use client';

import { useState, useTransition } from 'react';
import {
  createCustomerMigrationLinkAction,
  sendCustomerMigrationEmailAction,
} from '@/app/dashboard/actions';

interface Props {
  subscriptionId: string;
}

export default function SubscriptionMigrationLinkActions({
  subscriptionId,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [link, setLink] = useState('');

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
  }

  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <p className="text-xs text-stone-500">
        Prefere atualizar em outro dispositivo? Envie o link para seu e-mail ou
        copie para abrir depois.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setMessage('');
            setError('');
            startTransition(async () => {
              const result = await sendCustomerMigrationEmailAction({
                subscriptionId,
              });
              if ('error' in result && result.error) {
                setError(result.error);
                return;
              }
              if ('success' in result && result.success) {
                setMessage(
                  `Enviamos o link para ${result.email ?? 'seu e-mail'}`
                );
                if (result.updateLink) setLink(result.updateLink);
              }
            });
          }}
          className="inline-flex min-h-[44px] cursor-pointer items-center rounded-sm border border-white/15 px-3 py-2 font-display text-[11px] uppercase tracking-widest text-stone-200 transition-colors duration-200 hover:border-white/25 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? 'Enviando…' : 'Receber por e-mail'}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setMessage('');
            setError('');
            startTransition(async () => {
              const result = await createCustomerMigrationLinkAction({
                subscriptionId,
              });
              if ('error' in result && result.error) {
                setError(result.error);
                return;
              }
              if ('success' in result && result.success) {
                setLink(result.updateLink);
                const ok = await copyText(result.updateLink);
                setMessage(
                  ok
                    ? 'Link copiado'
                    : 'Link gerado — selecione e copie abaixo'
                );
              }
            });
          }}
          className="inline-flex min-h-[44px] cursor-pointer items-center rounded-sm border border-white/15 px-3 py-2 font-display text-[11px] uppercase tracking-widest text-stone-200 transition-colors duration-200 hover:border-white/25 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? 'Gerando…' : 'Copiar link'}
        </button>
      </div>
      {link ? (
        <p className="mt-3 break-all font-mono text-[11px] text-stone-500">
          {link}
        </p>
      ) : null}
      {message ? (
        <p className="mt-2 text-xs text-emerald-300">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-2 text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
