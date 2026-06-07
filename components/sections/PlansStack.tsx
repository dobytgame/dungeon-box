'use client';

import { useReducedMotion } from 'framer-motion';
import { plans } from '@/lib/data';
import PlanPanel from '@/components/sections/PlanPanel';

const PLAN_COUNT = plans.length;

export default function PlansStack() {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) {
    return (
      <section id="planos" className="bg-stone-950" aria-label="Planos de assinatura">
        <PlansIntro />
        {plans.map((plan, index) => (
          <PlanPanel key={plan.id} planId={plan.id} isFirst={index === 0} />
        ))}
      </section>
    );
  }

  return (
    <div className="bg-stone-950">
      <div className="px-6 pb-10 pt-16 lg:px-8">
        <PlansIntro />
      </div>
      <section
        id="planos"
        className="relative"
        style={{ height: `${PLAN_COUNT * 100}dvh` }}
        aria-label="Planos de assinatura"
      >
        {plans.map((plan, index) => (
          <div
            key={plan.id}
            className="sticky top-0 h-dvh w-full"
            style={{ zIndex: index + 10 }}
          >
            <PlanPanel
              planId={plan.id}
              stacked
              isFirst={index === 0}
              stackIndex={index}
            />
          </div>
        ))}
      </section>
    </div>
  );
}

function PlansIntro() {
  return (
    <div className="mx-auto max-w-7xl border-b border-white/[0.06] pb-10">
      <p className="font-display text-xs uppercase tracking-[0.35em] text-frost">
        Assinatura mensal
      </p>
      <h2 className="mt-3 max-w-2xl font-display text-4xl uppercase leading-[0.95] tracking-wide text-white md:text-5xl">
        Escolha o nível da sua{' '}
        <span className="text-gradient-ember">campanha</span>
      </h2>
      <p className="mt-4 max-w-lg text-base leading-relaxed text-stone-400">
        Mesma qualidade de impressão em todos os planos. Role para comparar peças,
        benefícios e preço.
      </p>
    </div>
  );
}
