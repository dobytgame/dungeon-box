'use client';

import Image from 'next/image';
import { Check } from 'lucide-react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import CTAButton from '@/components/ui/CTAButton';
import PlanBadge from '@/components/ui/PlanBadge';
import { WHATSAPP_GUILD_URL } from '@/lib/launch/constants';
import { launchPlans } from '@/lib/launch/data';
import { getPlanTheme } from '@/lib/plan-theme';

export default function LaunchPlans() {
  return (
    <section
      id="planos"
      className="relative bg-stone-950 px-4 py-20 sm:px-6 md:py-28"
      aria-labelledby="planos-title"
    >
      <div className="mx-auto max-w-7xl">
        <AnimatedSection>
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-display text-xs uppercase tracking-[0.35em] text-ember">
              Os planos
            </p>
            <h2
              id="planos-title"
              className="mt-3 font-display text-4xl uppercase leading-[0.95] tracking-wide text-white md:text-5xl lg:text-6xl"
            >
              Três planos. Um sistema.
              <br />
              <span className="text-gradient-ember">
                Cada um expande o anterior.
              </span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-stone-400 md:text-lg">
              Quem começa no Aventureiro pode fazer upgrade para o Herói no mês
              seguinte — e recebe tudo que estava faltando, com as peças
              encaixando perfeitamente.
            </p>
          </div>
        </AnimatedSection>

        <div className="mt-14 space-y-8 lg:space-y-12">
          {launchPlans.map((plan, index) => {
            const theme = getPlanTheme(plan.accent);
            const imageOnLeft = plan.imagePosition === 'left';

            return (
              <AnimatedSection key={plan.id} delay={index * 0.08}>
                <article
                  className={`relative overflow-hidden rounded-sm noise lg:grid lg:grid-cols-2 lg:items-center ${
                    plan.featured ? 'ring-1 ring-ember/40' : ''
                  }`}
                  style={{ backgroundColor: plan.bgSolid }}
                  aria-labelledby={`launch-plan-${plan.id}`}
                >
                  {plan.featured ? (
                    <div
                      className="absolute inset-x-0 top-0 z-20 h-px bg-ember"
                      aria-hidden="true"
                    />
                  ) : null}

                  <div
                    className={`relative min-h-[240px] sm:min-h-[280px] lg:min-h-[420px] ${
                      imageOnLeft ? 'lg:order-1' : 'lg:order-2'
                    }`}
                  >
                    <div
                      className={`pointer-events-none absolute inset-0 ${theme.glowOrb} blur-3xl`}
                      aria-hidden="true"
                    />
                    <Image
                      src={plan.image}
                      alt={`Plano ${plan.name} — cenários 3D modulares DungeonBox`}
                      fill
                      className={`object-contain p-6 sm:p-8 ${theme.organicTilt}`}
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                  </div>

                  <div
                    className={`relative z-10 p-6 sm:p-8 lg:p-10 xl:p-12 ${
                      imageOnLeft ? 'lg:order-2' : 'lg:order-1'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <PlanBadge
                        label={`Plano ${plan.order}`}
                        variant={theme.badgeVariant}
                        pulse={plan.featured}
                      />
                      {plan.badge ? (
                        <PlanBadge
                          label={plan.badge}
                          variant="ember"
                          pulse
                        />
                      ) : null}
                    </div>

                    <h3
                      id={`launch-plan-${plan.id}`}
                      className={`mt-5 font-display text-[clamp(2.5rem,6vw,4rem)] uppercase leading-none tracking-wide ${theme.nameClass}`}
                    >
                      {plan.name}
                    </h3>

                    <div
                      className={`relative mt-8 overflow-hidden rounded-sm border-l-4 bg-gradient-to-r to-transparent pl-6 pr-4 py-5 ${theme.accentBar} ${theme.specBg}`}
                    >
                      <p className="font-display text-[clamp(2rem,4vw,3rem)] leading-none text-white">
                        {plan.pieces}
                      </p>
                      <ul className="mt-3 space-y-1 text-sm text-stone-300 md:text-base">
                        {plan.specs.map((spec) => (
                          <li key={spec}>{spec}</li>
                        ))}
                      </ul>
                      <div className="mt-4 grid gap-1 text-sm text-stone-400">
                        <p>{plan.builds}</p>
                        <p>{plan.table}</p>
                        <p>{plan.session}</p>
                      </div>
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
                          <span className="text-sm leading-relaxed md:text-[15px]">
                            {perk}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              </AnimatedSection>
            );
          })}
        </div>

        <AnimatedSection delay={0.15}>
          <div className="mt-14 flex flex-col items-center gap-4 text-center">
            <CTAButton
              label="Quero ser Fundador — Entrar no Grupo"
              size="lg"
              href={WHATSAPP_GUILD_URL}
              external
              className="w-full sm:w-auto"
            />
            <p className="max-w-md text-sm text-stone-500">
              Os preços de fundador são especiais. Depois do lançamento oficial,
              sem garantia.
            </p>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
