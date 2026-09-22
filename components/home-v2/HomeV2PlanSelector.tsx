'use client';

import { useState } from 'react';
import HomeV2Button from '@/components/home-v2/HomeV2Button';
import HomeV2MediaFrame from '@/components/home-v2/HomeV2MediaFrame';
import HomeV2PlanDetails from '@/components/home-v2/HomeV2PlanDetails';
import HomeV2SectionHeading from '@/components/home-v2/HomeV2SectionHeading';
import {
  formatHomeV2Price,
  getHomeV2PlanCta,
  HOME_V2_COPY,
  type HomeV2Plan,
} from '@/lib/home-v2/content';
import {
  trackHomeV2CheckoutStarted,
  trackHomeV2PlanSelected,
  trackHomeV2PlanViewed,
} from '@/lib/home-v2/analytics';

interface Props {
  plans: HomeV2Plan[];
}

export default function HomeV2PlanSelector({ plans }: Props) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const openPlan = plans.find((plan) => plan.slug === openSlug) ?? null;

  return (
    <section
      id="planos"
      className="bg-mesa-stone px-4 py-16 sm:px-6 md:py-24"
      aria-labelledby="home-v2-planos-title"
    >
      <div className="mx-auto max-w-6xl">
        <HomeV2SectionHeading
          eyebrow={HOME_V2_COPY.plans.eyebrow}
          title={HOME_V2_COPY.plans.title}
          titleId="home-v2-planos-title"
        />

        <div className="mt-10 grid gap-10 md:grid-cols-3 md:items-start md:gap-5 lg:gap-8">
          {plans.map((plan, index) => (
            <article
              key={plan.slug}
              className={`group flex h-full flex-col transition duration-200 hover:-translate-y-1 ${
                index === 1 ? 'md:-translate-y-5' : index === 2 ? 'md:translate-y-5' : ''
              }`}
            >
              <HomeV2MediaFrame
                src={plan.heroImage.src}
                alt={plan.heroImage.alt}
                sizes="(min-width: 768px) 30vw, 100vw"
                ratioClassName="aspect-[5/6] rounded-3xl border border-white/10 shadow-2xl shadow-black/20"
              />
              <div className="relative z-10 -mt-10 mx-2 flex flex-1 flex-col rounded-3xl border border-white/10 bg-mesa-ink/95 p-5 pt-6 shadow-2xl shadow-black/20 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="home-v2-display text-2xl text-mesa-parchment">
                    {plan.name}
                  </h3>
                  {plan.badge ? (
                    <span className="home-v2-display rounded-sm bg-mesa-ember px-2 py-1 text-[10px] tracking-[0.12em] text-mesa-ink">
                      {plan.badge}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-mesa-ash">
                  {plan.tagline}
                </p>
                <p className="mt-4 font-semibold text-mesa-ember">
                  {formatHomeV2Price(plan.monthlyPriceCents)}
                  <span className="text-sm font-normal text-mesa-ash">/mês</span>
                </p>
                <dl className="mt-4 grid grid-cols-3 gap-2">
                  {plan.metrics.map((metric) => (
                    <div key={metric.label}>
                      <dt className="text-[11px] uppercase tracking-wide text-mesa-ash">
                        {metric.label}
                      </dt>
                      <dd className="mt-1 text-sm text-mesa-parchment">
                        {metric.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-auto flex flex-col gap-2 pt-5">
                  <HomeV2Button
                    href={plan.checkoutUrl}
                    className="w-full"
                    onClick={() => {
                      trackHomeV2PlanSelected(plan.slug, plan.monthlyPriceCents / 100);
                      trackHomeV2CheckoutStarted(plan.slug);
                    }}
                  >
                    {getHomeV2PlanCta(plan.slug)}
                  </HomeV2Button>
                  <button
                    type="button"
                    className="cursor-pointer text-sm text-mesa-ash underline-offset-2 hover:text-mesa-parchment hover:underline"
                    onClick={() => {
                      trackHomeV2PlanViewed(plan.slug);
                      setOpenSlug(plan.slug);
                    }}
                  >
                    Ver detalhes
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-8 text-sm text-mesa-ash">{HOME_V2_COPY.plans.footer}</p>
      </div>

      {openPlan ? (
        <HomeV2PlanDetails plan={openPlan} onClose={() => setOpenSlug(null)} />
      ) : null}
    </section>
  );
}
