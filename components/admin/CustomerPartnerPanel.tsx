'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Handshake } from 'lucide-react';
import PartnerBadge from '@/components/admin/PartnerBadge';
import {
  grantPartnerPlanAction,
  setSubscriptionPartnerAction,
} from '@/lib/admin/actions';
import type { PlanSlug } from '@/lib/checkout/plans';
import type { SubscriptionStatus } from '@/lib/dashboard/types';

export interface CustomerPartnerSubscription {
  id: string;
  planName: string | null;
  planSlug: string | null;
  status: SubscriptionStatus;
  isPartner: boolean;
}

interface PlanOption {
  slug: PlanSlug;
  name: string;
}

interface Props {
  userId: string;
  subscriptions: CustomerPartnerSubscription[];
  planOptions: PlanOption[];
}

export default function CustomerPartnerPanel({
  userId,
  subscriptions,
  planOptions,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PlanSlug>(
    planOptions[1]?.slug ?? planOptions[0]?.slug ?? 'heroi'
  );

  const hasActivePartner = subscriptions.some(
    (sub) => sub.isPartner && sub.status === 'active'
  );

  function grantPlan() {
    setMessage('');
    startTransition(async () => {
      const result = await grantPartnerPlanAction(userId, selectedPlan);
      if ('error' in result && result.error) {
        setMessage(result.error);
        return;
      }
      setMessage('Plano parceiro concedido. Assinatura ativa sem cobrança.');
    });
  }

  function toggleSubscription(subscriptionId: string, isPartner: boolean) {
    setMessage('');
    startTransition(async () => {
      const result = await setSubscriptionPartnerAction(
        subscriptionId,
        !isPartner
      );
      if ('error' in result && result.error) {
        setMessage(result.error);
        return;
      }
      setMessage(
        !isPartner
          ? 'Assinatura marcada como parceiro.'
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
            Conceda um plano sem cobrança ou marque uma assinatura existente como
            parceiro. O pedido entra na fila de produção normalmente.
          </p>
        </div>
        {hasActivePartner ? <PartnerBadge /> : null}
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label
            htmlFor={`partner-plan-${userId}`}
            className="block font-mono text-[10px] uppercase tracking-wider text-stone-500"
          >
            Conceder plano
          </label>
          <select
            id={`partner-plan-${userId}`}
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value as PlanSlug)}
            disabled={pending}
            className="mt-1.5 rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-sm text-white"
          >
            {planOptions.map((plan) => (
              <option key={plan.slug} value={plan.slug}>
                {plan.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={pending || planOptions.length === 0}
          onClick={grantPlan}
          className="cursor-pointer rounded-sm border border-violet-400/40 bg-violet-500/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-violet-100 transition-colors hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Salvando…' : 'Conceder como parceiro'}
        </button>
        <Link
          href="/admin/parceiros"
          className="rounded-sm border border-white/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-stone-400 transition-colors hover:border-white/20 hover:text-stone-200"
        >
          Ver todos os parceiros
        </Link>
      </div>

      {subscriptions.length > 0 ? (
        <ul className="mt-5 space-y-2 border-t border-white/[0.06] pt-4">
          {subscriptions.map((sub) => (
            <li
              key={sub.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-white/[0.06] bg-stone-950/40 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm text-stone-200">
                  {sub.planName ?? 'Plano'}
                  {sub.isPartner ? (
                    <span className="ml-2 inline-flex align-middle">
                      <PartnerBadge compact />
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-stone-500">{sub.status}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/admin/assinaturas/${sub.id}`}
                  className="text-xs text-console hover:underline"
                >
                  Abrir assinatura
                </Link>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => toggleSubscription(sub.id, sub.isPartner)}
                  className="cursor-pointer rounded-sm border border-white/10 px-3 py-1.5 font-display text-[10px] uppercase tracking-wider text-stone-300 hover:border-white/20 disabled:opacity-50"
                >
                  {sub.isPartner ? 'Remover parceiro' : 'Marcar parceiro'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-stone-500">
          Nenhuma assinatura ainda. Use o seletor acima para conceder um plano
          parceiro.
        </p>
      )}

      {message ? <p className="mt-4 text-sm text-stone-400">{message}</p> : null}
    </section>
  );
}
