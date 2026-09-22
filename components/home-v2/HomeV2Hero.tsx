'use client';

import { useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import HomeV2Button from '@/components/home-v2/HomeV2Button';
import { LP_HERO_IMAGE } from '@/lib/ui/lp-hero-image';
import { HOME_V2_COPY } from '@/lib/home-v2/content';
import { trackHomeV2HeroCta } from '@/lib/home-v2/analytics';

export default function HomeV2Hero() {
  const reducedMotion = useReducedMotion();
  const [videoFailed, setVideoFailed] = useState(false);
  const showVideo = reducedMotion !== true && !videoFailed;

  return (
    <section
      className="relative isolate min-h-[100svh] overflow-hidden bg-mesa-ink"
      aria-labelledby="home-v2-hero-title"
    >
      <div className="absolute inset-0">
        {!videoFailed ? (
          <video
            className="absolute inset-0 size-full object-cover opacity-70"
            autoPlay={showVideo}
            loop
            muted
            playsInline
            preload={showVideo ? 'auto' : 'none'}
            poster={LP_HERO_IMAGE.src}
            aria-hidden="true"
            onError={() => setVideoFailed(true)}
          >
            <source src="/video_background_hero_lp_v2.mp4" type="video/mp4" />
          </video>
        ) : null}
        <div
          className="absolute inset-0 bg-gradient-to-t from-mesa-ink via-mesa-ink/70 to-mesa-ink/25 md:bg-gradient-to-r md:from-mesa-ink md:via-mesa-ink/80 md:to-mesa-ink/20"
          aria-hidden="true"
        />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-4 pb-28 pt-28 sm:px-6 md:justify-center md:pb-20 md:pt-32">
        <div className="max-w-xl">
          <p className="home-v2-display text-[11px] tracking-[0.28em] text-mesa-jade">
            {HOME_V2_COPY.hero.eyebrow}
          </p>
          <h1
            id="home-v2-hero-title"
            className="home-v2-display mt-4 text-[clamp(2.7rem,10vw,6rem)] leading-[0.88] text-mesa-parchment"
          >
            {HOME_V2_COPY.hero.title}
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-mesa-ash sm:text-lg">
            {HOME_V2_COPY.hero.support}
          </p>
          <div className="mt-7 flex flex-col items-start gap-3">
            <HomeV2Button
              href="#planos"
              size="lg"
              onClick={() => trackHomeV2HeroCta('hero')}
            >
              {HOME_V2_COPY.hero.cta}
            </HomeV2Button>
            <p className="text-sm text-mesa-ash">{HOME_V2_COPY.hero.trust}</p>
          </div>
        </div>
      </div>

      {!reducedMotion ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-mesa-ink to-transparent"
          aria-hidden="true"
        />
      ) : null}
    </section>
  );
}
