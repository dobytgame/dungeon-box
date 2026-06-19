'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  cancelPendingUpgradeAction,
  scheduleSubscriptionUpgradeAction,
} from '@/app/dashboard/actions';
import { getCheckoutPlan, type PlanSlug } from '@/lib/checkout/plans';
import { formatMoney, relOne } from '@/lib/dashboard/format';
import type { Subscription } from '@/lib/dashboard/types';
import { upgradeOptionsForSlug } from '@/lib/subscriptions/plan-tier';

interface Props {
  subscription: Subscription;
}

export default function SubscriptionUpgrade({ subscription }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  const currentPlan = relOne(subscription.plans);
  const pendingPlan = relOne(subscription.pending_plan);
  const currentSlug = currentPlan?.slug as PlanSlug | undefined;

  const upgradeOptions = useMemo(() => {
    if (!currentSlug || subscription.status !== 'active') return [];
    return upgradeOptionsForSlug(currentSlug).map((slug) => {
      const marketing = getCheckoutPlan(slug);
      return {
        slug,
        name: marketing.name,
        priceCents: marketing.price * 100,
      };
    });
  }, [currentSlug, subscription.status]);

  if (!currentSlug || subscription.status !== 'active') {
    return null;
  }

  if (pendingPlan) {
    return (
      <div className="space-y-3 rounded-sm border border-frost/20 bg-frost/5 p-4">
        <p className="font-display text-sm uppercase tracking-wide text-frost">
          Upgrade agendado
        </p>
        <p className="text-sm text-stone-400">
          No próximo ciclo você passará para{' '}
          <span className="text-white">{pendingPlan.name}</span> (
          {formatMoney(pendingPlan.price_cents)}/mês). Até lá, continua no plano{' '}
          {currentPlan?.name ?? 'atual'}.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const result = await cancelPendingUpgradeAction(subscription.id);
              setMessage(
                'error' in result
                  ? result.error
                  : 'Upgrade cancelado. A cobrança do próximo ciclo permanece no plano atual.'
              );
            });
          }}
          className="cursor-pointer rounded-sm border border-white/15 px-4 py-2 font-display text-xs uppercase tracking-widest text-stone-300 transition hover:border-white/30 hover:text-white disabled:opacity-50"
        >
          Cancelar upgrade
        </button>
        {message ? <p className="text-sm text-stone-400">{message}</p> : null}
      </div>
    );
  }

  if (upgradeOptions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-display text-sm uppercase tracking-wide text-white">
          Fazer upgrade
        </p>
        <p className="mt-1 text-sm text-stone-500">
          O valor do plano superior passa a valer a partir do próximo ciclo de
          cobrança. Você continua recebendo o plano atual até lá.
        </p>
      </div>
      <div className="space-y-3">
        {upgradeOptions.map((option) => (
          <div
            key={option.slug}
            className="flex flex-col gap-3 rounded-sm border border-white/[0.06] bg-stone-950/40 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-medium text-white">{option.name}</p>
              <p className="text-sm text-stone-500">
                {formatMoney(option.priceCents)}/mês a partir do próximo ciclo
              </p>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  const result = await scheduleSubscriptionUpgradeAction(
                    subscription.id,
                    option.slug
                  );
                  setMessage(
                    'error' in result
                      ? result.error
                      : `Upgrade para ${option.name} agendado para o próximo ciclo.`
                  );
                });
              }}
              className="cursor-pointer rounded-sm border border-ember/40 bg-ember/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-ember transition hover:bg-ember/20 disabled:opacity-50"
            >
              Agendar upgrade
            </button>
          </div>
        ))}
      </div>
      {message ? <p className="text-sm text-stone-400">{message}</p> : null}
    </div>
  );
}
