'use client';

import { useEffect, useId, useRef } from 'react';
import HomeV2Button from '@/components/home-v2/HomeV2Button';
import { formatHomeV2Price, getHomeV2PlanCta, type HomeV2Plan } from '@/lib/home-v2/content';
import { trackHomeV2CheckoutStarted, trackHomeV2PlanSelected } from '@/lib/home-v2/analytics';

interface Props {
  plan: HomeV2Plan;
  onClose: () => void;
}

export default function HomeV2PlanDetails({ plan, onClose }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
      previouslyFocused.current?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-black/70"
        aria-label="Fechar detalhes do plano"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-md border border-white/10 bg-mesa-stone p-5 md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-sm md:p-7"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="home-v2-display text-[11px] tracking-[0.22em] text-mesa-jade">
              {plan.name}
            </p>
            <h3
              id={titleId}
              className="home-v2-display mt-2 text-3xl text-mesa-parchment"
            >
              {formatHomeV2Price(plan.monthlyPriceCents)}
              <span className="text-lg text-mesa-ash">/mês</span>
            </h3>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm border border-white/15 text-mesa-parchment"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <p className="text-sm leading-relaxed text-mesa-ash">{plan.tagline}</p>
        <p className="mt-4 text-sm text-mesa-parchment">{plan.details.quantities}</p>

        <ul className="mt-4 space-y-2 text-sm text-mesa-ash">
          {plan.details.pieces.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        {plan.details.comparison ? (
          <p className="mt-5 text-sm leading-relaxed text-mesa-parchment">
            {plan.details.comparison}
          </p>
        ) : null}

        <ul className="mt-5 space-y-1 text-sm text-mesa-ash">
          {plan.details.conditions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-mesa-ash">{plan.details.production}</p>

        <HomeV2Button
          href={plan.checkoutUrl}
          className="mt-6 w-full"
          onClick={() => {
            trackHomeV2PlanSelected(plan.slug, plan.monthlyPriceCents / 100);
            trackHomeV2CheckoutStarted(plan.slug);
          }}
        >
          {getHomeV2PlanCta(plan.slug)}
        </HomeV2Button>
      </div>
    </div>
  );
}
