'use client';

import { useState, useTransition } from 'react';
import { updateSubscriptionStatus } from '@/app/dashboard/actions';
import type { Subscription, SubscriptionStatus } from '@/lib/dashboard/types';

interface Props {
  subscription: Subscription;
}

export default function SubscriptionActions({ subscription }: Props) {
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  const status = subscription.status as SubscriptionStatus;
  const isPending = status === 'pending';
  const canPause = status === 'active';
  const canResume = status === 'paused';
  const canCancel =
    status === 'active' || status === 'paused' || status === 'past_due';
  const canAbandonPending = isPending;

  function run(action: 'pause' | 'cancel' | 'resume') {
    if (action === 'cancel' && canCancel && !reason.trim()) {
      setMessage('Informe o motivo do cancelamento.');
      return;
    }
    const fd = new FormData();
    fd.set('id', subscription.id);
    fd.set('action', action);
    if (reason) fd.set('reason', reason);
    startTransition(async () => {
      const result = await updateSubscriptionStatus(fd);
      setMessage(result.error ?? 'Alteração registrada com sucesso.');
    });
  }

  return (
    <div className="space-y-4">
      {isPending ? (
        <p className="text-sm text-amber-200/90">
          Pagamento ainda não concluído. Volte ao checkout para tentar de novo ou
          cancele esta tentativa abaixo.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {canPause ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run('pause')}
            className="cursor-pointer rounded-sm border border-white/15 px-5 py-2.5 font-display text-xs uppercase tracking-widest text-stone-300 transition hover:border-white/30 hover:text-white disabled:opacity-50"
          >
            Pausar
          </button>
        ) : null}
        {canResume ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run('resume')}
            className="cursor-pointer rounded-sm border border-frost/40 bg-frost/10 px-5 py-2.5 font-display text-xs uppercase tracking-widest text-frost transition hover:bg-frost/20 disabled:opacity-50"
          >
            Retomar
          </button>
        ) : null}
      </div>
      {canAbandonPending ? (
        <div className="border-l-2 border-amber-400/40 pl-4">
          <p className="font-display text-sm uppercase tracking-wide text-amber-200/90">
            Cancelar tentativa
          </p>
          <p className="mt-1 text-sm text-stone-500">
            Remove a assinatura pendente para você poder escolher outro plano ou
            pagar novamente.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run('cancel')}
            className="mt-3 cursor-pointer rounded-sm border border-amber-400/30 px-5 py-2.5 font-display text-xs uppercase tracking-widest text-amber-200/90 transition hover:bg-amber-500/10 disabled:opacity-50"
          >
            Cancelar tentativa
          </button>
        </div>
      ) : null}
      {canCancel ? (
        <div className="border-l-2 border-red-400/40 pl-4">
          <p className="font-display text-sm uppercase tracking-wide text-red-300/90">
            Cancelar assinatura
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo do cancelamento (opcional para registro interno)"
            rows={3}
            className="mt-2 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => run('cancel')}
            className="mt-3 cursor-pointer rounded-sm border border-red-400/30 px-5 py-2.5 font-display text-xs uppercase tracking-widest text-red-300/90 transition hover:bg-red-500/10 disabled:opacity-50"
          >
            Confirmar cancelamento
          </button>
        </div>
      ) : null}
      {message ? <p className="text-sm text-stone-400">{message}</p> : null}
    </div>
  );
}
