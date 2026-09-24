'use client';

import { useId } from 'react';
import { Check, Clock, Info, X } from 'lucide-react';
import HomeV2Button from '@/components/home-v2/HomeV2Button';
import { useHomeV2Dialog } from '@/components/home-v2/useHomeV2Dialog';
import { formatHomeV2Price, getHomeV2PlanCta, type HomeV2Plan } from '@/lib/home-v2/content';
import { trackHomeV2CheckoutStarted, trackHomeV2PlanSelected } from '@/lib/home-v2/analytics';

interface Props {
  plan: HomeV2Plan;
  onClose: () => void;
}

export default function HomeV2PlanDetails({ plan, onClose }: Props) {
  const titleId = useId();
  const { dialogRef, initialFocusRef: closeRef } = useHomeV2Dialog<HTMLButtonElement>(onClose);

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        tabIndex={-1}
        className="home-v2-overlay absolute inset-0 cursor-pointer bg-black/75 backdrop-blur-sm"
        aria-label="Fechar detalhes do plano"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="home-v2-sheet absolute inset-x-0 bottom-0 flex max-h-[90svh] flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-mesa-stone shadow-[0_-20px_60px_rgba(0,0,0,0.5)] md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[85vh] md:w-full md:max-w-lg md:rounded-3xl"
      >
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/20 md:hidden" aria-hidden="true" />

        <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-5 md:px-7 md:pt-7">
          <div>
            <p className="home-v2-display text-[11px] tracking-[0.22em] text-mesa-jade">
              Plano {plan.name}
            </p>
            <h3
              id={titleId}
              className="home-v2-display mt-2 flex items-baseline gap-1.5 text-4xl leading-none text-mesa-parchment"
            >
              {formatHomeV2Price(plan.monthlyPriceCents)}
              <span className="font-homeBody text-base font-normal normal-case tracking-normal text-mesa-ash">
                /mês
              </span>
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-mesa-ash">{plan.tagline}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/15 text-mesa-parchment transition-colors hover:border-white/40 hover:bg-white/5"
            aria-label="Fechar"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6 md:px-7">
          <p className="rounded-xl border border-mesa-jade/20 bg-mesa-jade/[0.05] px-4 py-3 text-sm text-mesa-parchment">
            {plan.details.quantities}
          </p>

          <p className="home-v2-display mt-6 text-[11px] tracking-[0.22em] text-mesa-ash">
            O que vem na caixa
          </p>
          <ul className="mt-3 space-y-2.5">
            {plan.details.pieces.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-mesa-parchment">
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-mesa-jade" strokeWidth={2.5} />
                {item}
              </li>
            ))}
          </ul>

          {plan.details.comparison ? (
            <p className="mt-6 border-l-2 border-mesa-ember/60 pl-4 text-sm leading-relaxed text-mesa-parchment">
              {plan.details.comparison}
            </p>
          ) : null}

          <ul className="mt-6 space-y-2 border-t border-white/10 pt-5">
            {plan.details.conditions.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-mesa-ash">
                <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
                {item}
              </li>
            ))}
            <li className="flex items-start gap-3 text-sm text-mesa-ash">
              <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
              {plan.details.production}
            </li>
          </ul>
        </div>

        <div className="border-t border-white/10 bg-mesa-stone/95 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:px-7">
          <HomeV2Button
            href={plan.checkoutUrl}
            size="lg"
            arrow
            className="w-full"
            onClick={() => {
              trackHomeV2PlanSelected(plan.slug, plan.monthlyPriceCents / 100);
              trackHomeV2CheckoutStarted(plan.slug);
            }}
          >
            {getHomeV2PlanCta(plan.slug)}
          </HomeV2Button>
        </div>
      </div>
    </div>
  );
}
