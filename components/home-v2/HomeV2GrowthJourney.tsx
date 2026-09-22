'use client';

import { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import HomeV2MediaFrame from '@/components/home-v2/HomeV2MediaFrame';
import HomeV2SectionHeading from '@/components/home-v2/HomeV2SectionHeading';
import { HOME_V2_COPY } from '@/lib/home-v2/content';

export default function HomeV2GrowthJourney() {
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const panels = HOME_V2_COPY.journey.panels;

  return (
    <section
      id="jornada"
      className="bg-mesa-ink px-4 py-16 sm:px-6 md:py-24"
      aria-labelledby="home-v2-jornada-title"
    >
      <div className="mx-auto max-w-6xl">
        <HomeV2SectionHeading
          eyebrow={HOME_V2_COPY.journey.eyebrow}
          title={HOME_V2_COPY.journey.title}
          titleId="home-v2-jornada-title"
        />

        <div className="mt-12 md:hidden">
          <ol className="relative space-y-7 border-l border-white/15 pl-7">
            {panels.map((panel, index) => (
              <li key={panel.month} className="relative">
                <span className="absolute -left-[3.05rem] top-5 flex size-10 items-center justify-center rounded-full border border-mesa-ember bg-mesa-ink text-xs font-semibold tabular-nums text-mesa-ember">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <article className="overflow-hidden rounded-3xl border border-white/10 bg-mesa-stone/80 shadow-2xl shadow-black/20">
                  <HomeV2MediaFrame
                    src={panel.image.src}
                    alt={panel.image.alt}
                    sizes="calc(100vw - 4rem)"
                    ratioClassName="aspect-[4/3]"
                    className="rounded-b-none"
                  />
                  <div className="p-5">
                    <p className="home-v2-display text-[11px] tracking-[0.22em] text-mesa-jade">
                      {panel.month}
                    </p>
                    <p className="mt-2 text-xl text-mesa-parchment">{panel.copy}</p>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-16 hidden gap-12 md:grid md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] md:items-center lg:gap-20">
          <div>
            <p className="home-v2-display mb-6 text-[11px] tracking-[0.28em] text-mesa-jade">
              Três momentos. Um mundo em expansão.
            </p>
            <ol className="relative space-y-3 pl-2 before:absolute before:bottom-8 before:left-[1.65rem] before:top-8 before:w-px before:bg-white/10">
            {panels.map((panel, index) => {
              const selected = index === active;
              return (
                <li key={panel.month}>
                  <button
                    type="button"
                    onClick={() => setActive(index)}
                    className={`group relative flex w-full cursor-pointer items-center gap-4 rounded-full px-3 py-4 text-left transition duration-200 ${
                      selected
                        ? 'bg-mesa-stone/80 shadow-xl shadow-black/10'
                        : 'opacity-60 hover:bg-mesa-stone/40 hover:opacity-100'
                    }`}
                    aria-pressed={selected}
                  >
                    <span
                      className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-colors ${
                        selected
                          ? 'border-mesa-ember bg-mesa-ember text-mesa-ink'
                          : 'border-white/20 bg-mesa-ink text-mesa-ash group-hover:border-mesa-jade/60'
                      }`}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>
                      <span className="home-v2-display block text-[11px] tracking-[0.22em] text-mesa-jade">
                        {panel.month}
                      </span>
                      <span className="mt-1 block text-xl text-mesa-parchment">
                        {panel.copy}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            </ol>
          </div>

          <div className="relative min-h-[34rem] w-full">
            <div
              className="absolute inset-10 rounded-full border border-mesa-jade/10"
              aria-hidden="true"
            />
            {panels.map((panel, index) => (
              <button
                key={panel.month}
                type="button"
                onClick={() => setActive(index)}
                tabIndex={index === active ? 0 : -1}
                aria-hidden={index !== active}
                aria-label={`Ver ${panel.month}: ${panel.copy}`}
                aria-pressed={index === active}
                className={`absolute overflow-hidden rounded-3xl border border-white/10 bg-mesa-stone text-left shadow-2xl shadow-black/30 transition-[opacity,transform] ${
                  reducedMotion ? 'duration-0' : 'duration-200'
                } ${
                  index === 0
                    ? 'left-0 top-12 w-[58%]'
                    : index === 1
                      ? 'left-[20%] top-0 w-[58%]'
                      : 'right-0 top-24 w-[52%]'
                } ${
                  index === active
                    ? 'z-30 scale-100 opacity-100'
                    : 'z-10 scale-[0.9] opacity-55 hover:opacity-85'
                }`}
              >
                <HomeV2MediaFrame
                  src={panel.image.src}
                  alt={panel.image.alt}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="w-full rounded-none"
                />
                <span className="absolute bottom-4 left-4 rounded-full bg-mesa-ink/90 px-3 py-1.5 text-[11px] font-semibold tracking-[0.16em] text-mesa-parchment">
                  {panel.month}
                </span>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-8 text-sm text-mesa-ash">{HOME_V2_COPY.journey.caption}</p>
      </div>
    </section>
  );
}
