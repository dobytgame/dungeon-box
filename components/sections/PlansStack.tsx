'use client';

import Link from 'next/link';
import { planSupportCopy, plans } from '@/lib/data';
import { getPlanTheme } from '@/lib/plan-theme';
import ComboPlansPromo from '@/components/sections/ComboPlansPromo';
import PlanPanel from '@/components/sections/PlanPanel';
import { COMBO_BILLING_ENABLED } from '@/lib/checkout/combo-billing';

function PlansIntro() {
  return (
    <div className="mx-auto max-w-7xl">
      <p className="font-display text-xs uppercase tracking-[0.35em] text-frost">
        Assinatura mensal
      </p>
      <h2 className="mt-3 max-w-3xl font-display text-3xl uppercase leading-[0.95] tracking-wide text-white sm:text-4xl md:text-5xl">
        {planSupportCopy.heroTitleLine1}{' '}
        <span className="text-gradient-ember">{planSupportCopy.heroTitleLine2}</span>
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-400">
        {planSupportCopy.heroSubtitle}
      </p>
      <p className="mt-3 max-w-2xl text-sm uppercase tracking-[0.16em] text-stone-500">
        {planSupportCopy.compatibility}
      </p>

      {/* Comparação rápida — visão de catálogo */}
      <div className="mt-10 hidden overflow-hidden rounded-sm border border-white/[0.08] bg-stone-950/60 sm:block">
        <div className="grid grid-cols-3 divide-x divide-white/[0.06]">
          {plans.map((plan) => {
            const theme = getPlanTheme(plan.accent);
            return (
              <Link
                key={plan.id}
                href={`#plan-${plan.id}`}
                className="group cursor-pointer px-5 py-4 transition-colors duration-200 hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ember"
              >
                <p
                  className={`font-display text-[10px] uppercase tracking-[0.22em] ${theme.featuredText}`}
                >
                  {plan.featured ? 'Mais popular' : `Plano 0${plan.order}`}
                </p>
                <p className={`mt-1 font-display text-lg uppercase tracking-wide ${theme.nameClass}`}>
                  {plan.name}
                </p>
                <p className="mt-2 font-display text-2xl text-white">
                  R$ {plan.price}
                  <span className="ml-1 text-xs text-stone-500">/mês</span>
                </p>
                <p className="mt-1 text-xs text-stone-500">{plan.pieces}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PlansTierNav() {
  return (
    <nav
      className="sticky z-[var(--z-plans-tier-nav)] border-y border-white/[0.06] bg-stone-950/95 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md top-[var(--site-header-offset)]"
      aria-label="Navegação entre planos"
    >
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 scrollbar-none sm:px-6 lg:px-8">
        {plans.map((plan) => {
          const theme = getPlanTheme(plan.accent);
          return (
            <Link
              key={plan.id}
              href={`#plan-${plan.id}`}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-sm border px-3 py-2 font-display text-[11px] uppercase tracking-[0.14em] transition-colors duration-200 hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember sm:px-4 sm:text-xs ${
                plan.featured
                  ? 'border-ember/40 bg-ember/5 text-ember'
                  : 'border-white/10 text-stone-300'
              }`}
            >
              <span className={plan.featured ? 'text-ember' : theme.nameClass}>
                {plan.name}
              </span>
              <span className="text-stone-500">R${plan.price}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function PlansSupportFooter() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-12 text-center sm:px-6 lg:px-8">
      <h3 className="font-display text-xl uppercase tracking-wide text-white md:text-2xl">
        {planSupportCopy.evolutionTitle}
      </h3>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-stone-400 md:text-base">
        {planSupportCopy.evolution}
      </p>
      <p className="mt-10 font-display text-sm uppercase tracking-[0.2em] text-stone-300">
        {planSupportCopy.guarantee}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-stone-500">
        {planSupportCopy.guaranteeExtended}
      </p>
    </div>
  );
}

export default function PlansStack() {
  return (
    <div id="planos" className="scroll-mt-[var(--site-header-offset)] bg-stone-950">
      <div className="border-b border-white/[0.06] px-4 pb-10 pt-[calc(var(--site-header-offset)+1.5rem)] sm:px-6 sm:pb-12 lg:px-8 lg:pt-[calc(var(--site-header-offset)+2rem)]">
        <PlansIntro />
      </div>

      <PlansTierNav />

      {COMBO_BILLING_ENABLED ? <ComboPlansPromo /> : null}

      <div className="divide-y divide-white/[0.06]">
        {plans.map((plan, index) => (
          <PlanPanel key={plan.id} planId={plan.id} isFirst={index === 0} />
        ))}
      </div>

      <PlansSupportFooter />
    </div>
  );
}
