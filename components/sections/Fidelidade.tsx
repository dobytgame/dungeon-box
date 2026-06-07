'use client';

import { Fragment, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { Check, Crown, Shield, Sword, Swords, Target } from 'lucide-react';
import { loyaltyLevels } from '@/lib/data';
import { getLoyaltyTheme } from '@/lib/loyalty-theme';
import AnimatedSection from '@/components/ui/AnimatedSection';

const iconMap = {
  sword: Sword,
  swords: Swords,
  bow: Target,
  shield: Shield,
  crown: Crown,
};

export default function Fidelidade() {
  const [active, setActive] = useState(0);
  const lineRef = useRef(null);
  const lineInView = useInView(lineRef, { once: true, margin: '-80px' });
  const reducedMotion = useReducedMotion();

  const current = loyaltyLevels[active];
  const theme = getLoyaltyTheme(current.accent);
  const ActiveIcon = iconMap[current.icon as keyof typeof iconMap];

  return (
    <section
      id="fidelidade"
      className="relative overflow-hidden bg-stone-950 bg-grid px-6 py-24 noise md:py-32"
      aria-labelledby="fidelidade-title"
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <p
          className={`absolute bottom-[-4%] left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-display uppercase leading-[0.78] tracking-tighter opacity-[0.05] ${theme.watermark} text-[clamp(4rem,22vw,18rem)] transition-colors duration-500`}
        >
          {current.name}
        </p>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <AnimatedSection>
          <div className="max-w-2xl border-b border-white/[0.06] pb-10">
            <p className="font-display text-xs uppercase tracking-[0.35em] text-frost">
              Programa de fidelidade
            </p>
            <h2
              id="fidelidade-title"
              className="mt-3 font-display text-4xl uppercase leading-[0.95] tracking-wide text-white md:text-5xl lg:text-6xl"
            >
              Quanto mais tempo,
              <br />
              <span className="text-gradient-ember">mais recompensas</span>
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-stone-400">
              Permanência na assinatura desbloqueia benefícios cumulativos. Selecione um
              nível para ver o que você ganha.
            </p>
          </div>
        </AnimatedSection>

        {/* Desktop timeline — segmentos só entre os nós, nunca atravessando os círculos */}
        <div ref={lineRef} className="relative mt-14 hidden md:flex md:items-start md:justify-between">
          {loyaltyLevels.map((level, index) => {
            const Icon = iconMap[level.icon as keyof typeof iconMap];
            const levelTheme = getLoyaltyTheme(level.accent);
            const isActive = active === index;
            const isLast = index === loyaltyLevels.length - 1;
            const segmentFilled = active > index;

            return (
              <Fragment key={level.level}>
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  className="group relative z-10 flex w-24 shrink-0 cursor-pointer flex-col items-center text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember lg:w-28"
                  aria-pressed={isActive}
                  aria-label={`${level.name} — ${level.months}`}
                >
                  <div
                    className={`flex h-16 w-16 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      isActive ? levelTheme.nodeActive : levelTheme.nodeIdle
                    } bg-stone-950`}
                  >
                    <Icon className="h-7 w-7" aria-hidden="true" />
                  </div>
                  <p
                    className={`mt-4 font-display text-sm uppercase tracking-wide transition-colors md:text-base ${
                      isActive ? 'text-white' : 'text-stone-400 group-hover:text-stone-200'
                    }`}
                  >
                    {level.name}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">{level.months}</p>
                </button>

                {!isLast && (
                  <div
                    className="relative z-0 flex h-16 min-w-6 flex-1 items-center px-1"
                    aria-hidden="true"
                  >
                    <div className="relative h-px w-full">
                      <span className="absolute inset-0 bg-stone-800" />
                      <motion.span
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-silver via-ember to-gold"
                        initial={{ width: '0%' }}
                        animate={{
                          width:
                            segmentFilled && (lineInView || reducedMotion) ? '100%' : '0%',
                        }}
                        transition={{
                          duration: reducedMotion ? 0 : 0.45,
                          ease: [0.25, 0.46, 0.45, 0.94],
                        }}
                      />
                    </div>
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>

        {/* Mobile stepper */}
        <div className="mt-10 space-y-0 md:hidden">
          {loyaltyLevels.map((level, index) => {
            const Icon = iconMap[level.icon as keyof typeof iconMap];
            const levelTheme = getLoyaltyTheme(level.accent);
            const isActive = active === index;
            const isLast = index === loyaltyLevels.length - 1;

            return (
              <div key={level.level} className="relative flex gap-4">
                {!isLast && (
                  <span
                    className="absolute left-5 top-14 bottom-0 w-px bg-stone-800"
                    aria-hidden="true"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  className="flex flex-1 cursor-pointer items-start gap-4 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
                  aria-pressed={isActive}
                >
                  <div
                    className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      isActive ? levelTheme.nodeActive : levelTheme.nodeIdle
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 pt-1">
                    <p
                      className={`font-display text-base uppercase tracking-wide ${
                        isActive ? 'text-white' : 'text-stone-400'
                      }`}
                    >
                      {level.name}
                    </p>
                    <p className="text-xs text-stone-500">{level.months}</p>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        <motion.div
          key={active}
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative mt-12 lg:mt-16"
        >
          <div
            className={`pointer-events-none absolute -inset-6 rounded-full blur-3xl ${theme.glow}`}
            aria-hidden="true"
          />

          <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_auto] lg:gap-12">
            <div
              className={`relative overflow-hidden rounded-sm border-l-4 bg-gradient-to-r to-transparent pl-6 pr-4 py-6 md:pl-8 md:py-8 ${theme.accentBar} ${theme.specBg}`}
            >
              <p className="font-display text-xs uppercase tracking-[0.35em] text-stone-500">
                Nível {String(current.level).padStart(2, '0')}
              </p>
              <h3 className={`mt-2 font-display text-3xl uppercase md:text-4xl ${theme.nameClass}`}>
                {current.name}
              </h3>
              <p className="mt-2 text-sm text-stone-400">{current.months}</p>

              <ul className="mt-6 divide-y divide-white/[0.06]">
                {current.perks.map((perk) => (
                  <li
                    key={perk}
                    className="flex items-start gap-3 py-3.5 text-stone-300 first:pt-0 last:pb-0"
                  >
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${theme.checkClass}`}
                      aria-hidden="true"
                    />
                    <span className="text-sm leading-relaxed md:text-base">{perk}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="hidden items-center justify-center lg:flex"
              aria-hidden="true"
            >
              <ActiveIcon
                className={`h-32 w-32 opacity-[0.12] ${theme.nameClass}`}
                strokeWidth={1}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
