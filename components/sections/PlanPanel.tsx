'use client';

import Image from 'next/image';
import { Check, Star } from 'lucide-react';
import { plans, planSupportCopy } from '@/lib/data';
import { getPlanTheme } from '@/lib/plan-theme';
import CTAButton from '@/components/ui/CTAButton';
import { checkoutHref } from '@/lib/checkout/plans';
import PlanBadge from '@/components/ui/PlanBadge';

type PlanId = (typeof plans)[number]['id'];

interface Props {
  planId: PlanId;
  isFirst?: boolean;
}

function PlanMetric({
  label,
  value,
  accentClass,
}: {
  label: string;
  value: string;
  accentClass: string;
}) {
  return (
    <div className="rounded-sm border border-white/[0.08] bg-stone-950/50 px-3 py-3 sm:px-4 sm:py-4">
      <p className="font-display text-[10px] uppercase tracking-[0.2em] text-stone-500">
        {label}
      </p>
      <p className={`mt-1 font-display text-sm leading-snug text-white sm:text-base ${accentClass}`}>
        {value}
      </p>
    </div>
  );
}

export default function PlanPanel({ planId, isFirst = false }: Props) {
  const plan = plans.find((p) => p.id === planId)!;
  const theme = getPlanTheme(plan.accent);
  const imageOnLeft = plan.imagePosition === 'left';
  const orderLabel = String(plan.order).padStart(2, '0');

  const sessionShort =
    'session' in plan && plan.session
      ? plan.session.replace(/^Sessão:\s*/i, '')
      : '—';
  const tableShort =
    'table' in plan && plan.table ? plan.table.replace(/^Mesa:\s*/i, '') : '—';
  const piecesShort = plan.pieces.replace(/\s*peças/i, '');

  return (
    <section
      id={`plan-${plan.id}`}
      className={`relative scroll-mt-[calc(var(--site-header-offset)+var(--plans-tier-nav-height)+0.75rem)] noise ${
        plan.featured ? 'ring-1 ring-inset ring-ember/25' : ''
      }`}
      style={{ backgroundColor: plan.bgSolid }}
      aria-labelledby={`plan-${plan.id}-title`}
    >
      {/* Capítulo — faixa editorial */}
      <header className="border-b border-white/[0.08]">
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr] gap-4 px-4 py-8 sm:gap-6 sm:px-6 sm:py-10 lg:px-8">
          <div
            className="hidden flex-col items-center justify-center border-r border-white/[0.08] pr-6 sm:flex"
            aria-hidden="true"
          >
            <span className="font-display text-4xl font-black leading-none text-white/10 lg:text-5xl">
              {orderLabel}
            </span>
            <span
              className={`mt-3 [writing-mode:vertical-rl] rotate-180 font-display text-[10px] uppercase tracking-[0.35em] ${theme.featuredText}`}
            >
              {plan.name}
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <PlanBadge
                label={`Plano ${orderLabel}`}
                variant={theme.badgeVariant}
                pulse={plan.featured}
              />
              {plan.badge ? (
                <PlanBadge
                  label={plan.badge}
                  variant={plan.featured ? 'ember' : theme.badgeVariant}
                  pulse={plan.featured}
                />
              ) : null}
              {plan.featured ? (
                <span className="inline-flex items-center gap-1.5 font-display text-[10px] uppercase tracking-[0.2em] text-ember sm:hidden">
                  <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                  Recomendado
                </span>
              ) : null}
            </div>

            <h2
              id={`plan-${plan.id}-title`}
              className={`mt-4 font-display text-[clamp(2.5rem,7vw,4.5rem)] uppercase leading-[0.9] tracking-wide ${theme.nameClass}`}
            >
              {plan.name}
            </h2>

            {plan.tagline ? (
              <p className="mt-3 max-w-xl text-base leading-relaxed text-stone-300 sm:text-lg">
                {plan.tagline}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      {/* Corpo — grade assimétrica */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-10 xl:gap-14">
          {/* Imagem */}
          <div
            className={`lg:col-span-5 ${
              imageOnLeft ? 'lg:order-1' : 'lg:order-2'
            } lg:sticky lg:top-[calc(var(--site-header-offset)+var(--plans-tier-nav-height)+0.75rem)] lg:self-start`}
          >
            <div className={`relative ${theme.organicTilt}`}>
              <div
                className={`pointer-events-none absolute -inset-8 blur-3xl ${theme.glowOrb} ${theme.organicMask}`}
                aria-hidden="true"
              />

              {plan.featured && plan.badge && (
                <span
                  className={`absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full bg-stone-950/90 px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.2em] backdrop-blur-sm sm:left-5 sm:top-5 ${theme.featuredText}`}
                >
                  <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                  {plan.badge}
                </span>
              )}

              <div
                className={`relative overflow-hidden border border-white/[0.1] ${theme.organicMask} shadow-[0_32px_80px_rgba(0,0,0,0.45)]`}
              >
                <Image
                  src={plan.image}
                  alt={`Plano ${plan.name} — cenários 3D DungeonBox`}
                  width={2528}
                  height={1686}
                  priority={isFirst}
                  className="relative z-10 h-auto w-full object-cover"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 via-transparent to-transparent" />
              </div>
            </div>
          </div>

          {/* Conteúdo */}
          <div
            className={`flex flex-col gap-6 lg:col-span-7 lg:gap-7 ${
              imageOnLeft ? 'lg:order-2' : 'lg:order-1'
            }`}
          >
            {/* Preço + CTA */}
            <div
              className={`grid gap-4 rounded-sm border bg-stone-950/35 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6 sm:p-6 ${
                plan.featured
                  ? 'border-ember/30'
                  : 'border-white/[0.1]'
              }`}
            >
              <div>
                <p className="font-display text-[clamp(2rem,4vw,3rem)] leading-none text-white">
                  R$ {plan.price}
                  <span className="ml-2 text-base text-stone-400 md:text-lg">
                    /mês
                  </span>
                </p>
                {plan.freight ? (
                  <p className="mt-2 text-sm text-stone-400">{plan.freight}</p>
                ) : null}
                {plan.billingNote ? (
                  <p className="mt-1 text-xs text-stone-500">{plan.billingNote}</p>
                ) : null}
              </div>
              <CTAButton
                label={`${plan.cta} →`}
                variant={theme.ctaVariant}
                size="lg"
                href={checkoutHref(plan.id)}
                trackingLocation={`planos_${plan.id}`}
                className="w-full sm:w-auto sm:shrink-0"
              />
            </div>

            {/* Métricas */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <PlanMetric
                label="Peças"
                value={`${piecesShort} peças`}
                accentClass={theme.nameClass}
              />
              <PlanMetric
                label="Mesa"
                value={tableShort}
                accentClass="text-stone-100"
              />
              <PlanMetric
                label="Sessão"
                value={sessionShort}
                accentClass="text-stone-100"
              />
            </div>
            <div
              className={`rounded-sm border border-l-4 px-4 py-3.5 sm:px-5 ${theme.accentBar} ${theme.specBg} border-white/10`}
            >
              <p className="font-display text-[10px] uppercase tracking-[0.22em] text-stone-300">
                Sobre a quantidade de peças
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-100">
                {planSupportCopy.piecesEstimateNote}
              </p>
            </div>

            {/* Conteúdo físico (esq.) + benefícios (dir.) */}
            <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
              <div
                className={`rounded-sm border-l-4 bg-gradient-to-br to-transparent p-5 ${theme.accentBar} ${theme.specBg}`}
              >
                <p className="font-display text-[10px] uppercase tracking-[0.25em] text-stone-500">
                  Conteúdo do kit
                </p>
                <p className="mt-2 font-display text-xl uppercase tracking-wide text-white sm:text-2xl">
                  {plan.pieces}
                </p>
                {'builds' in plan && plan.builds ? (
                  <p className="mt-2 text-sm text-stone-400">{plan.builds}</p>
                ) : null}
                {Array.isArray(plan.specs) ? (
                  <ul className="mt-4 space-y-1.5 text-sm text-stone-300">
                    {plan.specs.map((spec) => (
                      <li key={spec} className="flex gap-2">
                        <span className={`shrink-0 ${theme.checkClass}`}>—</span>
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="flex flex-col rounded-sm border border-white/[0.1] bg-stone-950/50 p-5">
                {'differentiator' in plan && plan.differentiator ? (
                  <>
                    <p className="font-display text-[10px] uppercase tracking-[0.25em] text-stone-500">
                      Por que este plano
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-stone-200 sm:text-base">
                      {plan.differentiator}
                    </p>
                    <div className="my-5 h-px bg-white/[0.06]" aria-hidden="true" />
                  </>
                ) : null}
                <p className="font-display text-[10px] uppercase tracking-[0.25em] text-stone-500">
                  O que você recebe
                </p>
                <ul className="mt-4 space-y-3">
                  {plan.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2.5">
                      <Check
                        className={`mt-0.5 h-4 w-4 shrink-0 ${theme.checkClass}`}
                        aria-hidden="true"
                      />
                      <span className="text-sm leading-relaxed text-stone-300">
                        {perk}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CTA secundário — mobile scroll longo */}
            <div className="border-t border-white/[0.06] pt-6 lg:hidden">
              <CTAButton
                label={`${plan.cta} →`}
                variant={theme.ctaVariant}
                size="lg"
                href={checkoutHref(plan.id)}
                trackingLocation={`planos_${plan.id}_mobile`}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className={`h-0.5 w-full ${theme.accentLine}`}
        aria-hidden="true"
      />
    </section>
  );
}
