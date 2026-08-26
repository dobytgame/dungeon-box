'use client';

import { useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import {
  Anchor,
  Castle,
  BrickWall,
  FlaskConical,
  Flame,
  Home,
  Lock,
  LucideIcon,
  Mountain,
  Skull,
  Store,
  Tent,
  TreePine,
  Wine,
} from 'lucide-react';
import {
  campaignCalendarCopy,
  campaignMonths,
  type CampaignMonthIcon,
} from '@/lib/campaign-calendar';
import AnimatedSection from '@/components/ui/AnimatedSection';

const themeIcons: Record<CampaignMonthIcon, LucideIcon> = {
  ruins: Home,
  cave: Mountain,
  tomb: BrickWall,
  shrine: Flame,
  camp: Tent,
  market: Store,
  lab: FlaskConical,
  prison: Lock,
  sewer: Anchor,
  throne: Castle,
  forest: TreePine,
  dragon: Skull,
};

export default function Temas() {
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridInView = useInView(gridRef, { once: true, margin: '-60px' });
  const reducedMotion = useReducedMotion();

  const displayIndex = hovered ?? active;
  const current = campaignMonths[displayIndex];

  return (
    <section
      id="temas"
      className="relative overflow-hidden bg-stone-950 bg-grid px-6 py-24 noise md:py-32"
      aria-labelledby="temas-title"
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <p className="absolute right-[-2%] top-[8%] select-none font-display text-[clamp(5rem,18vw,14rem)] uppercase leading-none tracking-tighter text-frost opacity-[0.04]">
          Temas
        </p>
        <p className="absolute bottom-[-6%] left-[-2%] select-none whitespace-nowrap font-display uppercase leading-[0.78] tracking-tighter text-frost opacity-[0.05] text-[clamp(3.5rem,14vw,11rem)] transition-opacity duration-500">
          {current.name}
        </p>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <AnimatedSection>
          <div className="max-w-2xl border-b border-white/[0.06] pb-10">
            <p className="font-display text-xs uppercase tracking-[0.35em] text-frost">
              {campaignCalendarCopy.eyebrow}
            </p>
            <h2
              id="temas-title"
              className="mt-3 font-display text-4xl uppercase leading-[0.95] tracking-wide text-white md:text-5xl lg:text-6xl"
            >
              {campaignCalendarCopy.titleLine1}
              <br />
              <span className="text-gradient-frost">{campaignCalendarCopy.titleLine2}</span>
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-stone-400">
              {campaignCalendarCopy.subtitle}
            </p>
          </div>
        </AnimatedSection>

        <div
          ref={gridRef}
          className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-4"
        >
          {campaignMonths.map((theme, index) => {
            const Icon = themeIcons[theme.icon] ?? Home;
            const isSelected = active === index;
            const isExpanded = displayIndex === index;
            const displayLore = theme.revealed
              ? theme.lore
              : campaignCalendarCopy.lockedLore;
            const displayName = theme.revealed
              ? theme.name
              : campaignCalendarCopy.lockedLabel;

            return (
              <motion.button
                key={theme.month}
                type="button"
                initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                animate={
                  gridInView
                    ? { opacity: 1, y: 0 }
                    : reducedMotion
                      ? { opacity: 1, y: 0 }
                      : { opacity: 0, y: 12 }
                }
                transition={{
                  duration: reducedMotion ? 0 : 0.35,
                  delay: reducedMotion ? 0 : index * 0.04,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-sm bg-gradient-to-b from-stone-900/90 to-stone-950 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-frost"
                onClick={() => setActive(index)}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(index)}
                onBlur={() => setHovered(null)}
                aria-pressed={isSelected}
                aria-label={`Mês ${theme.month}: ${theme.name}${theme.revealed ? ` — ${theme.lore}` : ''}`}
              >
                <span
                  className="pointer-events-none absolute -right-1 top-2 select-none font-display text-5xl leading-none text-white/[0.05] sm:text-6xl"
                  aria-hidden="true"
                >
                  {theme.month}
                </span>

                <span
                  className={`absolute left-0 top-0 bottom-0 w-1 bg-frost transition-opacity duration-300 ${
                    isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                  }`}
                  aria-hidden="true"
                />

                {/* Estado padrão */}
                <div
                  className={`relative z-10 flex h-full flex-col justify-between p-3 transition-all duration-300 sm:p-4 ${
                    isExpanded
                      ? 'pointer-events-none scale-95 opacity-0'
                      : 'opacity-100'
                  }`}
                >
                  <span className="font-display text-[10px] uppercase tracking-[0.25em] text-stone-600">
                    Mês {theme.month}
                  </span>

                  <div className="flex flex-1 flex-col items-center justify-center">
                    {theme.revealed ? (
                      <Icon
                        className="h-7 w-7 text-stone-500 transition-colors duration-300 group-hover:text-stone-300 sm:h-8 sm:w-8"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    ) : (
                      <Lock
                        className="h-6 w-6 text-stone-600 sm:h-7 sm:w-7"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  <p className="font-display text-[11px] uppercase leading-tight tracking-wide text-stone-500 transition-colors duration-300 group-hover:text-stone-300 sm:text-xs">
                    {theme.revealed ? theme.name : displayName}
                  </p>
                </div>

                {/* Lore dentro do card — hover / seleção */}
                <div
                  className={`absolute inset-0 z-20 flex flex-col bg-gradient-to-t from-stone-950 via-stone-950/95 to-stone-950/75 p-3 transition-all duration-300 sm:p-4 ${
                    isExpanded
                      ? 'translate-y-0 opacity-100'
                      : 'pointer-events-none translate-y-2 opacity-0'
                  }`}
                  aria-hidden={!isExpanded}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-display text-[10px] uppercase tracking-[0.25em] text-frost">
                      Mês {theme.month}
                    </span>
                    <Icon
                      className="h-4 w-4 shrink-0 text-frost/70 sm:h-5 sm:w-5"
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="mt-auto">
                    <p className="font-display text-xs uppercase leading-tight tracking-wide text-gradient-frost sm:text-sm">
                      {theme.revealed ? theme.name : displayName}
                    </p>
                    <p className="mt-2 text-[11px] leading-relaxed text-stone-300 sm:text-xs">
                      {displayLore}
                    </p>
                    {theme.revealed ? (
                      <p className="mt-2 text-[10px] leading-snug text-stone-500">
                        {campaignCalendarCopy.footerNote}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-frost/15 via-frost/5 to-transparent transition-opacity duration-300 ${
                    isExpanded ? 'opacity-100' : 'opacity-0'
                  }`}
                  aria-hidden="true"
                />
              </motion.button>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-stone-500">
          {campaignCalendarCopy.footerNote}
        </p>

        <div className="mt-6" aria-hidden="true">
          <div className="flex gap-1">
            {campaignMonths.map((theme, index) => (
              <button
                key={`progress-${theme.month}`}
                type="button"
                onClick={() => setActive(index)}
                onMouseEnter={() => setHovered(index)}
                onMouseLeave={() => setHovered(null)}
                className="group h-1 min-w-0 flex-1 cursor-pointer rounded-full bg-stone-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-frost"
                aria-label={`Ir para mês ${theme.month}`}
              >
                <span
                  className={`block h-full rounded-full transition-colors duration-300 ${
                    index <= displayIndex
                      ? 'bg-gradient-to-r from-frost/80 to-frost'
                      : 'bg-transparent'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
