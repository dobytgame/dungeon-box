'use client';

import { useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { Check, Pause, Play } from 'lucide-react';
import HomeV2Button from '@/components/home-v2/HomeV2Button';
import { LP_HERO_IMAGE } from '@/lib/ui/lp-hero-image';
import { HOME_V2_COPY } from '@/lib/home-v2/content';
import { trackHomeV2HeroCta } from '@/lib/home-v2/analytics';

function step(index: number) {
  return { '--enter-step': index } as React.CSSProperties;
}

export default function HomeV2Hero() {
  const reducedMotion = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const showVideo = reducedMotion !== true && !videoFailed;
  const { hero } = HOME_V2_COPY;

  const toggleVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
    }
  };

  return (
    <section
      className="home-v2-grain relative isolate min-h-[100svh] overflow-hidden bg-mesa-ink"
      aria-labelledby="home-v2-hero-title"
    >
      <div className="absolute inset-0 -z-10">
        {!videoFailed ? (
          <video
            ref={videoRef}
            className="home-v2-video absolute inset-0 size-full object-cover opacity-90"
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
          className="absolute inset-0 bg-gradient-to-t from-mesa-ink/90 via-mesa-ink/45 to-transparent md:bg-gradient-to-r md:from-mesa-ink/80 md:via-mesa-ink/35 md:to-transparent"
          aria-hidden="true"
        />
        <div
          className="home-v2-grid home-v2-fog-load absolute inset-0 opacity-60 md:[mask-image:radial-gradient(ellipse_55%_70%_at_20%_55%,#000_10%,transparent_70%)]"
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-mesa-ink to-transparent"
          aria-hidden="true"
        />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col justify-end px-4 pb-24 pt-28 sm:px-6 md:justify-center md:pb-24 md:pt-32">
        <div className="max-w-2xl">
          <p
            className="home-v2-enter home-v2-display text-[11px] tracking-[0.28em] text-mesa-jade"
            style={step(0)}
          >
            {hero.eyebrow}
          </p>

          <h1
            id="home-v2-hero-title"
            className="home-v2-enter home-v2-display mt-4 text-[clamp(2.7rem,10vw,6rem)] leading-[0.88] text-mesa-parchment"
            style={step(1)}
          >
            {hero.title}
          </h1>

          <p
            className="home-v2-enter mt-5 max-w-md text-base leading-relaxed text-mesa-ash sm:text-lg"
            style={step(3)}
          >
            {hero.support}
          </p>

          <div
            className="home-v2-enter mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            style={step(4)}
          >
            <HomeV2Button
              href="#planos"
              size="lg"
              arrow
              className="home-v2-sheen-once w-full sm:w-auto"
              onClick={() => trackHomeV2HeroCta('hero')}
            >
              {hero.cta}
            </HomeV2Button>
            <HomeV2Button
              href="#jornada"
              size="lg"
              variant="ghost"
              className="hidden sm:inline-flex"
              onClick={() => trackHomeV2HeroCta('hero-secondary')}
            >
              {hero.secondaryCta}
            </HomeV2Button>
          </div>

          <div className="home-v2-enter mt-5" style={step(5)}>
            <p className="text-sm text-mesa-parchment">
              <span className="font-semibold">{HOME_V2_COPY.startingPrice}</span>
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-mesa-ash">
              {hero.guarantees.map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5">
                  <Check aria-hidden="true" className="size-3.5 text-mesa-jade" strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {showVideo ? (
        <button
          type="button"
          onClick={toggleVideo}
          className="absolute right-4 top-24 z-10 flex size-11 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-mesa-ink/60 text-mesa-parchment backdrop-blur-md transition-colors hover:border-white/40 sm:right-6 md:top-28"
          aria-label={paused ? 'Reproduzir vídeo de fundo' : 'Pausar vídeo de fundo'}
          aria-pressed={paused}
        >
          {paused ? (
            <Play aria-hidden="true" className="size-4" />
          ) : (
            <Pause aria-hidden="true" className="size-4" />
          )}
        </button>
      ) : null}

      <div
        className="home-v2-scroll-cue pointer-events-none absolute bottom-6 left-1/2 hidden h-10 w-px -translate-x-1/2 overflow-hidden bg-white/10 md:block"
        aria-hidden="true"
      />
    </section>
  );
}
