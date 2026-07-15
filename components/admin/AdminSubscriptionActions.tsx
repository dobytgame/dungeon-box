'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import SyncAsaasButton from '@/components/admin/SyncAsaasButton';
import RepairSubscriptionCyclesButton from '@/components/admin/RepairSubscriptionCyclesButton';
import {
  adminManualActivateSubscriptionAction,
  adminManualDeactivateSubscriptionAction,
  adminUpdateSubscriptionStatusAction,
} from '@/lib/admin/actions';
import type { Subscription, SubscriptionStatus } from '@/lib/dashboard/types';
import { isComboTerm, type BillingTerm } from '@/lib/checkout/combo-billing';

interface Props {
  subscription: Subscription;
  showAsaasSync?: boolean;
}

export default function AdminSubscriptionActions({
  subscription,
  showAsaasSync = false,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  const status = subscription.status as SubscriptionStatus;
  const canManualActivate =
    status === 'pending' ||
    status === 'past_due' ||
    status === 'paused' ||
    status === 'cancelled';
  const canManualDeactivate =
    status === 'active' ||
    status === 'paused' ||
    status === 'past_due' ||
    status === 'pending';
  const canPause = status === 'active';
  const canResume = status === 'paused';
  const canCancel =
    status === 'active' ||
    status === 'paused' ||
    status === 'past_due' ||
    status === 'pending';
  const billingTerm = (subscription.billing_term ?? 'monthly') as BillingTerm;
  const showCycleRepair =
    !subscription.is_partner &&
    !isComboTerm(billingTerm) &&
    (status === 'active' || status === 'past_due' || status === 'cancelled');

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
      router.refresh();
    });
  }

  function runManual(action: 'activate' | 'deactivate') {
    const confirmMessage =
      action === 'activate'
        ? 'Ativar esta assinatura manualmente no sistema? Isso não altera cobranças no Asaas/Stripe.'
        : 'Desativar esta assinatura manualmente no sistema? Isso não cancela cobranças no Asaas/Stripe.';

    if (!window.confirm(confirmMessage)) return;

    setMessage('');
    startTransition(async () => {
      const result =
        action === 'activate'
          ? await adminManualActivateSubscriptionAction(
              subscription.id,
              reason || null
            )
          : await adminManualDeactivateSubscriptionAction(
              subscription.id,
              reason || null
            );

      if ('error' in result && result.error) {
        setMessage(result.error);
        return;
      }

      setMessage(
        action === 'activate'
          ? 'Assinatura ativada manualmente.'
          : 'Assinatura desativada manualmente.'
      );
      router.refresh();
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

      <div className="mt-4 flex flex-wrap items-start gap-3">
        {showAsaasSync ? (
          <SyncAsaasButton subscriptionId={subscription.id} />
        ) : null}
        {showCycleRepair ? (
          <RepairSubscriptionCyclesButton subscriptionId={subscription.id} />
        ) : null}
        {canManualActivate ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => runManual('activate')}
            className="cursor-pointer rounded-sm border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-emerald-200 transition hover:border-emerald-400/50 disabled:opacity-50"
          >
            Ativar manualmente
          </button>
        ) : null}
        {canManualDeactivate ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => runManual('deactivate')}
            className="cursor-pointer rounded-sm border border-amber-400/30 bg-amber-500/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-amber-200 transition hover:border-amber-400/50 disabled:opacity-50"
          >
            Desativar manualmente
          </button>
        ) : null}
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

      {canCancel || canManualActivate || canManualDeactivate ? (
        <div className="mt-5 border-l-2 border-stone-500/30 pl-4">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo (opcional, para registro interno)"
            rows={2}
            className="w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          />
          {canCancel ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run('cancel')}
              className="mt-3 cursor-pointer rounded-sm border border-red-400/30 px-4 py-2 font-display text-xs uppercase tracking-widest text-red-300/90"
            >
              Cancelar assinatura (com gateway)
            </button>
          ) : null}
          <p className="mt-3 text-xs text-stone-600">
            Ativar/desativar manualmente altera só o sistema local. Cancelar
            também tenta atualizar Asaas/Stripe.
          </p>
        </div>
      ) : null}

      {message ? <p className="mt-4 text-sm text-stone-400">{message}</p> : null}
    </section>
  );
}
