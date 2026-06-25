'use client';

import { useState, useTransition } from 'react';
import { Handshake } from 'lucide-react';
import { setSubscriptionPartnerAction } from '@/lib/admin/actions';
import type { Subscription } from '@/lib/dashboard/types';

interface Props {
  subscription: Subscription;
}

export default function PartnerSubscriptionPanel({ subscription }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const isPartner = Boolean(subscription.is_partner);

  function toggle() {
    setMessage('');
    startTransition(async () => {
      const result = await setSubscriptionPartnerAction(
        subscription.id,
        !isPartner
      );
      if ('error' in result && result.error) {
        setMessage(result.error);
        return;
      }
      setMessage(
        !isPartner
          ? 'Marcado como parceiro. Assinatura ativa sem cobrança.'
          : 'Flag de parceiro removida.'
      );
    });
  }

  return (
    <section className="rounded-sm border border-violet-500/20 bg-violet-500/[0.04] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 font-display text-sm uppercase tracking-widest text-violet-200">
            <Handshake className="h-4 w-4" aria-hidden="true" />
            Parceiro
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-400">
            Parceiros recebem a caixa normalmente, mas não passam pelo Asaas nem
            geram cobrança. Ao ativar, a assinatura fica ativa e o ciclo atual
            entra na fila de produção.
          </p>
        </div>
        {isPartner ? (
          <span className="rounded-sm border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-violet-200">
            Parceiro ativo
          </span>
        ) : null}
      </div>

      <button
        type="button"
        disabled={pending}
        onClick={toggle}
        className={`mt-5 cursor-pointer rounded-sm border px-4 py-2 font-display text-xs uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          isPartner
            ? 'border-white/15 text-stone-300 hover:border-white/30'
            : 'border-violet-400/40 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20'
        }`}
      >
        {pending
          ? 'Salvando…'
          : isPartner
            ? 'Remover parceiro'
            : 'Marcar como parceiro'}
      </button>

      {message ? <p className="mt-4 text-sm text-stone-400">{message}</p> : null}
    </section>
  );
}
