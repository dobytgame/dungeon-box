'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import {
  Anchor,
  Castle,
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
import { themes } from '@/lib/data';
import AnimatedSection from '@/components/ui/AnimatedSection';

const themeIcons: Record<string, LucideIcon> = {
  ruins: Home,
  skull: Skull,
  tavern: Wine,
  shrine: Flame,
  camp: Tent,
  market: Store,
  lab: FlaskConical,
  prison: Lock,
  sewer: Anchor,
  throne: Castle,
  forest: TreePine,
  dragon: Mountain,
};

export default function Temas() {
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridInView = useInView(gridRef, { once: true, margin: '-60px' });
  const reducedMotion = useReducedMotion();

  const displayIndex = hovered ?? active;
  const current = themes[displayIndex];
  const CurrentIcon = themeIcons[current.icon] ?? Home;

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
              Calendário da campanha
            </p>
            <h2
              id="temas-title"
              className="mt-3 font-display text-4xl uppercase leading-[0.95] tracking-wide text-white md:text-5xl lg:text-6xl"
            >
              12 meses ·
              <br />
              <span className="text-gradient-frost">12 aventuras</span>
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-stone-400">
              Cada mês um cenário novo para sua mesa. Passe o mouse sobre um mês para
              revelar a lore — ou toque para fixar a seleção.
            </p>
          </div>
        </AnimatedSection>

        <div ref={gridRef} className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 lg:gap-4">
          {themes.map((theme, index) => {
            const Icon = themeIcons[theme.icon] ?? Home;
            const isSelected = active === index;
            const isPreview = displayIndex === index;

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
                aria-label={`Mês ${theme.month}: ${theme.name} — ${theme.lore}`}
              >
                <span
                  className="pointer-events-none absolute -right-1 top-2 select-none font-display text-5xl leading-none text-white/[0.05] sm:text-6xl"
                  aria-hidden="true"
                >
                  {theme.month}
                </span>

                <span
                  className={`absolute left-0 top-0 bottom-0 w-1 bg-frost transition-opacity duration-300 ${
                    isPreview ? 'opacity-100' : 'opacity-0'
                  }`}
                  aria-hidden="true"
                />

                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-frost/10 via-transparent to-transparent transition-opacity duration-300 ${
                    isPreview ? 'opacity-100' : 'opacity-0'
                  }`}
                  aria-hidden="true"
                />

                <div className="relative z-10 flex h-full flex-col justify-between p-3 sm:p-4">
                  <span className="font-display text-[10px] uppercase tracking-[0.25em] text-stone-600">
                    Mês {theme.month}
                  </span>

                  <div className="flex flex-1 flex-col items-center justify-center">
                    <Icon
                      className={`h-7 w-7 transition-colors duration-300 sm:h-8 sm:w-8 ${
                        isPreview ? 'text-frost' : 'text-stone-500 group-hover:text-stone-300'
                      }`}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </div>

                  <p
                    className={`font-display text-[11px] uppercase leading-tight tracking-wide transition-colors duration-300 sm:text-xs ${
                      isPreview ? 'text-frost' : 'text-stone-500 group-hover:text-stone-300'
                    }`}
                  >
                    {theme.name}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div
          className="relative mt-6 min-h-[9.5rem] md:mt-8 md:min-h-[10.5rem]"
          aria-live="polite"
          aria-atomic="true"
        >
          <div
            className="pointer-events-none absolute -inset-x-4 -inset-y-3 rounded-sm bg-frost/[0.04] blur-2xl"
            aria-hidden="true"
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={displayIndex}
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative overflow-hidden rounded-sm border-l-4 border-l-frost bg-stone-950/90 py-5 pl-5 pr-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-md md:py-6 md:pl-7 md:pr-8"
            >
              <div
                className="pointer-events-none absolute -right-6 -top-8 h-32 w-32 rounded-full bg-frost/10 blur-3xl"
                aria-hidden="true"
              />

              <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto] md:gap-10">
                <div>
                  <p className="font-display text-xs uppercase tracking-[0.35em] text-stone-500">
                    Mês {current.month} de 12
                    {hovered !== null && (
                      <span className="ml-2 text-frost/70">· preview</span>
                    )}
                  </p>
                  <h3 className="mt-2 font-display text-2xl uppercase text-gradient-frost md:text-3xl lg:text-4xl">
                    {current.name}
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-300 md:text-base">
                    {current.lore}
                  </p>
                  <p className="mt-3 text-xs text-stone-500 md:text-sm">
                    Kit temático exclusivo · Peças modulares · Compatível com meses anteriores
                  </p>
                </div>

                <div className="hidden shrink-0 md:flex" aria-hidden="true">
                  <CurrentIcon
                    className="h-20 w-20 text-frost opacity-[0.14] lg:h-28 lg:w-28"
                    strokeWidth={0.75}
                  />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-8" aria-hidden="true">
          <div className="flex gap-1">
            {themes.map((theme, index) => (
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
