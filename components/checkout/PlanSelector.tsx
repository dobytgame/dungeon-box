'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';
import { plans } from '@/lib/data';
import { getPlanTheme } from '@/lib/plan-theme';
import type { PlanSlug } from '@/lib/checkout/plans';

interface Props {
  selected: PlanSlug;
}

export default function PlanSelector({ selected }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {plans.map((plan) => {
        const theme = getPlanTheme(plan.accent);
        const isActive = plan.id === selected;
        return (
          <Link
            key={plan.id}
            href={`/checkout?plan=${plan.id}`}
            aria-current={isActive ? 'true' : undefined}
            className={`group relative cursor-pointer overflow-hidden rounded-sm border p-4 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${
              isActive
                ? 'border-ember/45 bg-ember/[0.07]'
                : 'border-white/[0.08] bg-stone-950/50 hover:border-white/15 hover:bg-stone-950/70'
            }`}
          >
            {plan.featured && plan.badge ? (
              <span
                className={`mb-2 inline-flex items-center gap-1 font-display text-[9px] uppercase tracking-[0.2em] ${theme.featuredText}`}
              >
                <Star className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
                {plan.badge}
              </span>
            ) : (
              <span className="mb-2 block h-[14px]" aria-hidden="true" />
            )}
            <p
              className={`font-display text-sm uppercase tracking-wide ${
                isActive ? 'text-white' : 'text-stone-300 group-hover:text-white'
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
            <div
              className={`absolute bottom-0 left-0 h-0.5 w-full origin-left transition-transform duration-300 ${
                theme.accentLine
              } ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-50'}`}
              aria-hidden="true"
            />
          </Link>
        );
      })}
    </div>
  );
}
