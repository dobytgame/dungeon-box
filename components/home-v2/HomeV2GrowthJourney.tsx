'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import HomeV2Button from '@/components/home-v2/HomeV2Button';
import HomeV2MediaFrame from '@/components/home-v2/HomeV2MediaFrame';
import HomeV2SectionHeading from '@/components/home-v2/HomeV2SectionHeading';
import { HOME_V2_COPY } from '@/lib/home-v2/content';
import { trackHomeV2HeroCta } from '@/lib/home-v2/analytics';

export default function HomeV2GrowthJourney() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const { journey } = HOME_V2_COPY;
  const panels = journey.panels;
  const progress = panels.length > 1 ? active / (panels.length - 1) : 1;

  const focusTab = (index: number) => {
    const next = (index + panels.length) % panels.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  const onTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      focusTab(index + 1);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      focusTab(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusTab(panels.length - 1);
    }
  };

  return (
    <section
      id="jornada"
      className="relative isolate overflow-hidden bg-mesa-ink px-4 py-20 sm:px-6 md:py-28"
      aria-labelledby="home-v2-jornada-title"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] overflow-hidden md:inset-0 md:h-auto"
        aria-hidden="true"
      >
        <Image
          src="/images/home-v2/jornada-bg.webp"
          alt=""
          fill
          sizes="100vw"
          quality={70}
          className="home-v2-journey-bg object-cover object-[82%_85%] md:object-[62%_72%] opacity-50 saturate-[0.85] md:opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-mesa-ink via-mesa-ink/30 to-mesa-ink md:via-mesa-ink/45" />
        <div className="absolute inset-x-0 bottom-0 hidden h-48 bg-gradient-to-t from-mesa-ink to-transparent md:block" />
        <div className="absolute inset-0 hidden bg-[radial-gradient(ellipse_70%_90%_at_18%_55%,rgba(10,11,12,0.92),transparent_70%)] md:block" />
        <div className="home-v2-grid home-v2-fog absolute inset-0 opacity-60" />
      </div>

      <div className="mx-auto max-w-6xl">
        <HomeV2SectionHeading
          eyebrow={journey.eyebrow}
          title={journey.title}
          titleId="home-v2-jornada-title"
        />

        <div className="relative mt-12 md:hidden">
        <ol className="relative space-y-6 border-l border-white/15 pl-7">
          {panels.map((panel, index) => (
            <li
              key={panel.month}
              className="home-v2-reveal relative"
              style={{ '--stagger': index * 0.5 } as React.CSSProperties}
            >
              <span className="absolute -left-[2.95rem] top-5 flex size-10 items-center justify-center rounded-full border border-mesa-jade/50 bg-mesa-ink text-xs font-semibold tabular-nums text-mesa-jade">
                {String(index + 1).padStart(2, '0')}
              </span>
              <article className="overflow-hidden rounded-2xl border border-white/10 bg-mesa-stone/80 shadow-2xl shadow-black/20">
                <HomeV2MediaFrame
                  src={panel.image.src}
                  alt={panel.image.alt}
                  sizes="calc(100vw - 4rem)"
                  ratioClassName="aspect-[16/10]"
                />
                <div className="p-5">
                  <p className="home-v2-display text-[11px] tracking-[0.22em] text-mesa-jade">
                    {panel.month}
                  </p>
                  <p className="mt-2 text-xl text-mesa-parchment">
                    {panel.copy}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ol>
          <span
            className="home-v2-rail pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-mesa-jade via-mesa-jade/80 to-mesa-jade/0"
            aria-hidden="true"
          />
        </div>

        <div className="mt-16 hidden gap-12 md:grid md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:items-center lg:gap-20">
          <div className="home-v2-reveal">
            <p className="home-v2-display mb-6 text-[11px] tracking-[0.28em] text-mesa-jade">
              Três momentos. Um mundo em expansão.
            </p>

            <div className="relative">
              <div
                className="absolute bottom-7 left-[1.25rem] top-7 w-px bg-white/10"
                aria-hidden="true"
              >
                <div
                  className="absolute inset-x-0 top-0 h-full origin-top bg-mesa-jade transition-transform duration-500 ease-out"
                  style={{ transform: `scaleY(${progress})` }}
                />
              </div>

              <div role="tablist" aria-label="Momentos da assinatura" aria-orientation="vertical" className="relative space-y-2">
                {panels.map((panel, index) => {
                  const selected = index === active;
                  const reached = index <= active;
                  return (
                    <button
                      key={panel.month}
                      ref={(node) => {
                        tabRefs.current[index] = node;
                      }}
                      type="button"
                      role="tab"
                      id={`home-v2-jornada-tab-${index}`}
                      aria-selected={selected}
                      aria-controls="home-v2-jornada-stage"
                      tabIndex={selected ? 0 : -1}
                      onClick={() => setActive(index)}
                      onKeyDown={(event) => onTabKeyDown(event, index)}
                      className={`group relative flex w-full cursor-pointer items-center gap-5 rounded-sm py-4 pr-4 text-left transition-colors duration-200 ${
                        selected ? '' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <span
                        className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums transition-colors duration-300 ${
                          reached
                            ? 'border-mesa-jade bg-mesa-jade text-mesa-ink'
                            : 'border-white/20 bg-mesa-ink text-mesa-ash group-hover:border-mesa-jade/60'
                        }`}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span>
                        <span
                          className={`home-v2-display block text-[11px] tracking-[0.22em] transition-colors ${
                            selected ? 'text-mesa-jade' : 'text-mesa-ash'
                          }`}
                        >
                          {panel.month}
                        </span>
                        <span
                          className={`mt-1 block text-xl transition-colors duration-200 ${
                            selected
                              ? 'text-mesa-parchment'
                              : 'text-mesa-parchment/35 group-hover:text-mesa-parchment/70'
                          }`}
                        >
                          {panel.copy}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            id="home-v2-jornada-stage"
            role="tabpanel"
            aria-labelledby={`home-v2-jornada-tab-${active}`}
            className="home-v2-reveal relative"
            style={{ '--stagger': 1 } as React.CSSProperties}
          >
            <div
              className="absolute -inset-3 -z-10 translate-x-4 translate-y-4 rotate-[2.5deg] rounded-3xl border border-white/[0.06] bg-mesa-stone/40"
              aria-hidden="true"
            />
            <div
              className="absolute -inset-3 -z-10 translate-x-2 translate-y-2 rotate-[1deg] rounded-3xl border border-white/[0.06] bg-mesa-stone/60"
              aria-hidden="true"
            />

            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/10 bg-mesa-stone shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]">
              {panels.map((panel, index) => (
                <div
                  key={panel.month}
                  className={`absolute inset-0 transition-[opacity,transform] duration-300 ease-out ${
                    index === active ? 'scale-100 opacity-100' : 'scale-[1.03] opacity-0'
                  }`}
                  aria-hidden={index !== active}
                >
                  <HomeV2MediaFrame
                    src={panel.image.src}
                    alt={panel.image.alt}
                    sizes="(min-width: 768px) 55vw, 100vw"
                    ratioClassName="size-full"
                  />
                </div>
              ))}
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-mesa-ink/85 to-transparent"
                aria-hidden="true"
              />
              <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4">
                <p className="home-v2-display text-3xl leading-none text-mesa-parchment lg:text-4xl">
                  {panels[active]?.month}
                </p>
                <div className="flex gap-1.5" aria-hidden="true">
                  {panels.map((panel, index) => (
                    <span
                      key={panel.month}
                      className={`h-1 rounded-full transition-[width,background-color] duration-300 ${
                        index === active ? 'w-8 bg-mesa-jade' : 'w-3 bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="home-v2-reveal mt-12 flex flex-col gap-5 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-base text-mesa-ash">{journey.caption}</p>
          <HomeV2Button
            href="#planos"
            arrow
            className="w-full sm:w-auto"
            onClick={() => trackHomeV2HeroCta('journey')}
          >
            {journey.cta}
          </HomeV2Button>
        </div>
      </div>
    </section>
  );
}
