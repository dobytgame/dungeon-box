'use client';

import Image from 'next/image';
import { Check, Star } from 'lucide-react';
import { plans } from '@/lib/data';
import { getPlanTheme } from '@/lib/plan-theme';
import CTAButton from '@/components/ui/CTAButton';
import { checkoutHref } from '@/lib/checkout/plans';
import PlanBadge from '@/components/ui/PlanBadge';

type PlanId = (typeof plans)[number]['id'];

interface Props {
  planId: PlanId;
  stacked?: boolean;
  isFirst?: boolean;
  stackIndex?: number;
}

function PlanBackgroundName({
  name,
  themeClass,
  imageOnLeft,
}: {
  name: string;
  themeClass: string;
  imageOnLeft: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <p
        className={`absolute bottom-[-2%] select-none font-display uppercase leading-[0.78] tracking-tighter opacity-[0.055] ${themeClass} ${
          imageOnLeft
            ? 'right-[-2%] text-right'
            : 'left-[-2%] text-left'
        } text-[clamp(5rem,26vw,22rem)] lg:text-[clamp(6rem,30vw,26rem)]`}
      >
        {name}
      </p>
    </div>
  );
}

export default function PlanPanel({
  planId,
  stacked = false,
  isFirst = false,
  stackIndex = 0,
}: Props) {
  const plan = plans.find((p) => p.id === planId)!;
  const theme = getPlanTheme(plan.accent);
  const imageOnLeft = plan.imagePosition === 'left';
  const orderLabel = String(plan.order).padStart(2, '0');

  const panelContent = (
    <div
      className={`relative mx-auto grid w-full max-w-7xl items-center gap-10 px-6 lg:grid-cols-2 lg:gap-14 lg:px-8 ${
        stacked ? 'py-6' : ''
      }`}
    >
      {/* Image — máscara orgânica por plano */}
      <div className={imageOnLeft ? 'lg:order-1' : 'lg:order-2'}>
        <div
          className={`relative mx-auto max-w-md transition-transform duration-500 ease-out hover:scale-[1.02] lg:max-w-none ${theme.organicTilt}`}
        >
          <div
            className={`pointer-events-none absolute -inset-6 blur-3xl ${theme.glowOrb} ${theme.organicMask}`}
            aria-hidden="true"
          />
          <div
            className={`pointer-events-none absolute -inset-2 border border-white/[0.08] ${theme.organicMask}`}
            aria-hidden="true"
          />

          {plan.featured && plan.badge && (
            <span
              className={`absolute left-6 top-6 z-20 inline-flex items-center gap-1.5 rounded-full bg-stone-950/85 px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.2em] backdrop-blur-sm ${theme.featuredText}`}
            >
              <Star className="h-3 w-3 fill-current" aria-hidden="true" />
              {plan.badge}
            </span>
          )}

          <div
            className={`relative overflow-hidden ${theme.organicMask} shadow-[0_28px_72px_rgba(0,0,0,0.5)]`}
          >
            <Image
              src={plan.image}
              alt={`Plano ${plan.name} — cenários 3D DungeonBox`}
              width={2528}
              height={1686}
              priority={isFirst}
              className="relative z-10 w-full h-auto object-cover"
              sizes="(max-width: 1024px) 100vw, 48vw"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={imageOnLeft ? 'lg:order-2' : 'lg:order-1'}>
        <div className="flex items-center gap-3">
          <PlanBadge
            label={`Plano ${orderLabel}`}
            variant={theme.badgeVariant}
            pulse={plan.featured}
          />
          <span className="hidden h-px flex-1 bg-white/10 sm:block" aria-hidden="true" />
        </div>

        <h2
          id={`plan-${plan.id}-title`}
          className={`mt-5 font-display text-[clamp(2.5rem,6vw,4.5rem)] uppercase leading-none tracking-wide ${theme.nameClass}`}
        >
          {plan.name}
        </h2>

        <div
          className={`relative mt-8 overflow-hidden rounded-sm border-l-4 bg-gradient-to-r to-transparent pl-6 pr-4 py-5 ${theme.accentBar} ${theme.specBg}`}
        >
          <p className="font-display text-[clamp(2.5rem,5vw,3.75rem)] leading-none text-white">
            R$ {plan.price}
            <span className="ml-2 text-lg text-stone-400 md:text-xl">/mês</span>
          </p>
          <p className="mt-3 max-w-sm text-base leading-relaxed text-stone-300">
            {plan.pieces}
          </p>
        </div>

        <ul className="mt-8 space-y-0 divide-y divide-white/[0.06]">
          {plan.perks.map((perk) => (
            <li
              key={perk}
              className="flex items-start gap-3 py-3.5 text-stone-300 first:pt-0 last:pb-0"
            >
              <Check
                className={`mt-0.5 h-4 w-4 shrink-0 ${theme.checkClass}`}
                aria-hidden="true"
              />
              <span className="text-sm leading-relaxed md:text-[15px]">{perk}</span>
            </li>
          ))}
        </ul>

        <div className="mt-9">
          <CTAButton
            label={`${plan.cta} →`}
            variant={theme.ctaVariant}
            size="lg"
            href={checkoutHref(plan.id)}
          />
        </div>
      </div>
    </div>
  );

  const shellClass = 'relative h-dvh w-full overflow-hidden noise';

  if (stacked) {
    return (
      <div
        className={shellClass}
        style={{ backgroundColor: plan.bgSolid }}
        aria-labelledby={`plan-${plan.id}-title`}
      >
        {stackIndex > 0 && (
          <div
            className={`absolute inset-x-0 top-0 z-20 h-px ${theme.accentLine}`}
            aria-hidden="true"
          />
        )}

        <PlanBackgroundName
          name={plan.name}
          themeClass={theme.watermark}
          imageOnLeft={imageOnLeft}
        />

        <div className="relative z-10 flex h-full w-full items-center">
          {panelContent}
        </div>
      </div>
    );
  }

  return (
    <section
      className={`${shellClass} px-0 py-20 md:py-28`}
      style={{ backgroundColor: plan.bgSolid }}
      aria-labelledby={`plan-${plan.id}-title`}
    >
      <PlanBackgroundName
        name={plan.name}
        themeClass={theme.watermark}
        imageOnLeft={imageOnLeft}
      />
      <div className="relative z-10">{panelContent}</div>
    </section>
  );
}
