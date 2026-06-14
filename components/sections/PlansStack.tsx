'use client';

import { useReducedMotion } from 'framer-motion';
import { planSupportCopy, plans } from '@/lib/data';
import PlanPanel from '@/components/sections/PlanPanel';

const PLAN_COUNT = plans.length;

export default function PlansStack() {
  const reducedMotion = useReducedMotion();
  const showScrollStack = !reducedMotion;

  return (
    <div id="planos" className="bg-stone-950">
      <section
        className={showScrollStack ? 'lg:hidden' : undefined}
        aria-label="Planos de assinatura"
      >
        <div className="px-4 pb-10 pt-16 sm:px-6 lg:px-8">
          <PlansIntro scrollStack={false} />
        </div>
        {plans.map((plan, index) => (
          <PlanPanel key={plan.id} planId={plan.id} isFirst={index === 0} />
        ))}
        <PlansSupportFooter />
      </section>

      {showScrollStack ? (
        <div className="hidden lg:block">
          <div className="px-4 pb-10 pt-16 lg:px-8">
            <PlansIntro scrollStack />
          </div>
          <section
            className="relative"
            style={{ height: `${PLAN_COUNT * 100}dvh` }}
            aria-label="Planos de assinatura — comparação em scroll"
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
          <PlansSupportFooter />
        </div>
      ) : null}
    </div>
  );
}

function PlansIntro({ scrollStack }: { scrollStack: boolean }) {
  return (
    <div className="mx-auto max-w-7xl border-b border-white/[0.06] pb-8 sm:pb-10">
      <p className="font-display text-xs uppercase tracking-[0.35em] text-frost">
        Assinatura mensal
      </p>
      <h2 className="mt-3 max-w-2xl font-display text-3xl uppercase leading-[0.95] tracking-wide text-white sm:text-4xl md:text-5xl">
        Escolha o nível da sua{' '}
        <span className="text-gradient-ember">campanha</span>
      </h2>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-stone-400">
        {planSupportCopy.evolution}
      </p>
    </div>
  );
}

function PlansSupportFooter() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-4 text-center sm:px-6 lg:px-8">
      <p className="font-display text-sm uppercase tracking-[0.2em] text-stone-300">
        {planSupportCopy.guarantee}
      </p>
      <p className="mt-3 text-sm leading-relaxed text-stone-500">
        {planSupportCopy.compatibility}
      </p>
    </div>
  );
}
