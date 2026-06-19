'use client';

import { useState, useTransition } from 'react';
import { adminUpdateSubscriptionStatusAction } from '@/lib/admin/actions';
import type { Subscription, SubscriptionStatus } from '@/lib/dashboard/types';

interface Props {
  subscription: Subscription;
}

export default function AdminSubscriptionActions({ subscription }: Props) {
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  const status = subscription.status as SubscriptionStatus;
  const canPause = status === 'active';
  const canResume = status === 'paused';
  const canCancel =
    status === 'active' ||
    status === 'paused' ||
    status === 'past_due' ||
    status === 'pending';

  function run(action: 'pause' | 'cancel' | 'resume') {
    setMessage('');
    startTransition(async () => {
      const result = await adminUpdateSubscriptionStatusAction(
        subscription.id,
        action,
        reason || null
      );
      if ('error' in result && result.error) {
        setMessage(result.error);
        return;
      }
      setMessage('Assinatura atualizada.');
    });
  }

  return (
    <section className="rounded-sm border border-white/[0.06] p-5 md:p-6">
      <h3 className="font-display text-sm uppercase tracking-widest text-stone-400">
        Ações administrativas
      </h3>
      <p className="mt-2 text-sm text-stone-500">
        Sincroniza com o gateway quando configurado e registra auditoria.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {canPause ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run('pause')}
            className="cursor-pointer rounded-sm border border-white/15 px-4 py-2 font-display text-xs uppercase tracking-widest text-stone-300 hover:border-white/30"
          >
            Pausar
          </button>
        ) : null}
        {canResume ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run('resume')}
            className="cursor-pointer rounded-sm border border-console/40 bg-console/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-console"
          >
            Retomar
          </button>
        ) : null}
      </div>

      {canCancel ? (
        <div className="mt-5 border-l-2 border-red-400/40 pl-4">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo (opcional, para registro interno)"
            rows={2}
            className="w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => run('cancel')}
            className="mt-3 cursor-pointer rounded-sm border border-red-400/30 px-4 py-2 font-display text-xs uppercase tracking-widest text-red-300/90"
          >
            Cancelar assinatura
          </button>
        </div>
      ) : null}

      {message ? <p className="mt-4 text-sm text-stone-400">{message}</p> : null}
    </section>
  );
}
