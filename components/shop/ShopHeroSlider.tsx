'use client';

import { useState } from 'react';
import HomeV2Button from '@/components/home-v2/HomeV2Button';
import StoreMediaImage from '@/components/store/StoreMediaImage';
import type { StoreBanner } from '@/lib/store/banners';

interface Props {
  banners: StoreBanner[];
}

const SLIDE_DURATION_MS = 6000;

const step = (value: number) => ({ '--enter-step': value }) as React.CSSProperties;

export default function ShopHeroSlider({ banners }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  if (banners.length === 0) return null;

  const banner = banners[index]!;
  const multiple = banners.length > 1;
  const primary =
    banner.ctaLabel && banner.ctaHref
      ? { href: banner.ctaHref, label: banner.ctaLabel }
      : { href: '#produtos', label: 'Ver produtos' };
  const secondary = primary.href.includes('planos')
    ? { href: '#produtos', label: 'Ver produtos' }
    : { href: '/#planos', label: 'Conhecer assinatura' };

  return (
    <section
      className="home-v2-grain relative isolate overflow-hidden border-b border-white/10 bg-mesa-ink"
      aria-roledescription={multiple ? 'carrossel' : undefined}
      aria-label="Destaques da loja"
      data-paused={paused || undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="absolute inset-0 -z-20" aria-hidden="true">
        {banners.map((entry, entryIndex) =>
          entry.imageUrl ? (
            <StoreMediaImage
              key={entry.id}
              src={entry.imageUrl}
              alt=""
              fill
              priority={entryIndex === 0}
              sizes="100vw"
              className={`object-cover object-[70%_center] transition-opacity duration-700 ease-out ${
                entryIndex === index ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ) : null
        )}
      </div>
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-t from-mesa-ink via-mesa-ink/75 to-mesa-ink/10 md:bg-gradient-to-r md:from-mesa-ink md:via-mesa-ink/70 md:to-transparent"
        aria-hidden="true"
      />
      <div className="home-v2-grid home-v2-fog-load absolute inset-0 -z-10 opacity-60" aria-hidden="true" />

      <div className="mx-auto flex min-h-[30rem] max-w-[75rem] flex-col justify-end px-4 pb-10 pt-40 sm:min-h-[32rem] sm:px-6 md:min-h-[34rem] md:justify-center md:pb-16 md:pt-16">
        <div key={banner.id} className={`max-w-2xl ${index > 0 ? 'home-v2-swap' : ''}`}>
          <p
            className="home-v2-enter home-v2-display flex items-center gap-3 text-[11px] tracking-[0.28em] text-mesa-jade"
            style={step(0)}
          >
            Loja DungeonBox
            {multiple ? (
              <span className="tabular-nums text-mesa-ash">
                {String(index + 1).padStart(2, '0')} / {String(banners.length).padStart(2, '0')}
              </span>
            ) : null}
          </p>
          <h1
            className="home-v2-enter home-v2-display mt-4 text-balance text-[clamp(2.5rem,8vw,5rem)] leading-[0.9] text-mesa-parchment"
            style={step(1)}
          >
            {banner.title}
          </h1>
          {banner.subtitle ? (
            <p
              className="home-v2-enter mt-5 max-w-xl text-pretty text-base leading-relaxed text-mesa-ash sm:text-lg"
              style={step(2)}
            >
              {banner.subtitle}
            </p>
          ) : null}
          <div
            className="home-v2-enter mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            style={step(3)}
          >
            <HomeV2Button
              href={primary.href}
              size="lg"
              arrow
              className="home-v2-sheen-once w-full sm:w-auto"
            >
              {primary.label}
            </HomeV2Button>
            {secondary.href !== primary.href ? (
              <HomeV2Button href={secondary.href} variant="ghost" size="lg" className="w-full sm:w-auto">
                {secondary.label}
              </HomeV2Button>
            ) : null}
          </div>
        </div>

        {multiple ? (
          <div className="mt-10 flex gap-2" role="group" aria-label="Escolher destaque">
            {banners.map((entry, dotIndex) => {
              const active = dotIndex === index;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setIndex(dotIndex)}
                  aria-label={`Destaque ${dotIndex + 1}: ${entry.title}`}
                  aria-current={active ? 'true' : undefined}
                  className="group flex h-11 w-14 cursor-pointer items-center sm:w-20"
                >
                  <span className="relative h-0.5 w-full overflow-hidden rounded-full bg-white/20 transition-colors group-hover:bg-white/40">
                    {active ? (
                      <span
                        key={`${entry.id}-${index}`}
                        className="home-v2-progress absolute inset-0 bg-mesa-ember"
                        style={{ '--slide-duration': `${SLIDE_DURATION_MS}ms` } as React.CSSProperties}
                        onAnimationEnd={() => setIndex((index + 1) % banners.length)}
                      />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
