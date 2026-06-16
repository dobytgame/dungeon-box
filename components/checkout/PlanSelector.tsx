'use client';

import { Check, Plus } from 'lucide-react';
import { plans } from '@/lib/data';
import { getPlanTheme } from '@/lib/plan-theme';
import type { PlanSlug } from '@/lib/checkout/plans';

interface Props {
  selected: PlanSlug[];
  activePlanSlugs?: PlanSlug[];
  onChange: (slugs: PlanSlug[]) => void;
}

export default function PlanSelector({
  selected,
  activePlanSlugs = [],
  onChange,
}: Props) {
  function togglePlan(planId: PlanSlug) {
    if (activePlanSlugs.includes(planId)) return;

    if (selected.includes(planId)) {
      const next = selected.filter((slug) => slug !== planId);
      onChange(next.length > 0 ? next : [planId]);
      return;
    }

    onChange([...selected, planId]);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500">
        Selecione um ou mais planos. Cada plano gera uma assinatura mensal
        separada.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {plans.map((plan) => {
          const theme = getPlanTheme(plan.accent);
          const planId = plan.id as PlanSlug;
          const isSubscribed = activePlanSlugs.includes(planId);
          const isSelected = selected.includes(planId);

          const cardClass = `group relative w-full overflow-hidden rounded-sm border p-4 text-left transition-colors duration-200 ${
            isSubscribed
              ? 'border-white/[0.06] bg-stone-950/30 opacity-75'
              : isSelected
                ? 'border-ember/45 bg-ember/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember'
                : 'border-white/[0.08] bg-stone-950/50 hover:border-white/15 hover:bg-stone-950/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember'
          }`;

          const inner = (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                {plan.featured && plan.badge ? (
                  <span
                    className={`inline-flex items-center gap-1 font-display text-[9px] uppercase tracking-[0.2em] ${theme.featuredText}`}
                  >
                    {plan.badge}
                  </span>
                ) : (
                  <span className="h-[14px]" aria-hidden="true" />
                )}
                {!isSubscribed ? (
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${
                      isSelected
                        ? 'border-ember bg-ember text-stone-950'
                        : 'border-white/15 text-stone-500'
                    }`}
                    aria-hidden="true"
                  >
                    {isSelected ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" />
                    )}
                  </span>
                ) : null}
              </div>
              {isSubscribed ? (
                <span className="mb-2 inline-block font-display text-[9px] uppercase tracking-[0.2em] text-stone-500">
                  Já assinado
                </span>
              ) : null}
              <p
                className={`font-display text-sm uppercase tracking-wide ${
                  isSelected ? 'text-white' : 'text-stone-300 group-hover:text-white'
                }`}
              >
                {plan.name}
              </p>
              <p className="mt-2 font-display text-xl tabular-nums text-white">
                R$ {plan.price}
                <span className="text-xs font-normal text-stone-500">/mês</span>
              </p>
              <p className="mt-1 text-[11px] leading-snug text-stone-500">
                {plan.pieces}
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-stone-600">
                {plan.freight}
              </p>
              <div
                className={`absolute bottom-0 left-0 h-0.5 w-full origin-left transition-transform duration-300 ${
                  theme.accentLine
                } ${isSelected ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'}`}
                aria-hidden="true"
              />
            </>
          );

          if (isSubscribed) {
            return (
              <div key={plan.id} className={cardClass} aria-disabled="true">
                {inner}
              </div>
            );
          }

          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => togglePlan(planId)}
              aria-pressed={isSelected}
              className={`cursor-pointer ${cardClass}`}
            >
              {inner}
            </button>
          );
        })}
      </div>
    </div>
  );
}
