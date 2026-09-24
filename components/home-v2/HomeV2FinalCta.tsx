'use client';

import HomeV2Button from '@/components/home-v2/HomeV2Button';
import HomeV2SectionHeading from '@/components/home-v2/HomeV2SectionHeading';
import { HOME_V2_COPY } from '@/lib/home-v2/content';
import { trackHomeV2HeroCta } from '@/lib/home-v2/analytics';

export default function HomeV2FinalCta() {
  const { finalCta } = HOME_V2_COPY;

  return (
    <section
      id="comecar"
      className="home-v2-grain relative isolate overflow-hidden bg-mesa-ink px-4 py-24 sm:px-6 md:py-32"
      aria-labelledby="home-v2-final-title"
    >
      <div className="home-v2-grid home-v2-fog absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_60%_70%_at_50%_50%,#000_10%,transparent_70%)]" aria-hidden="true" />
      <div
        className="absolute left-1/2 top-1/2 -z-10 h-[28rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-mesa-ember/[0.12] blur-[120px]"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-4xl text-center">
        <HomeV2SectionHeading
          eyebrow={finalCta.eyebrow}
          title={finalCta.title}
          titleId="home-v2-final-title"
          align="center"
        />
        <div
          className="home-v2-reveal mt-10 flex flex-col items-center gap-4"
          style={{ '--stagger': 2 } as React.CSSProperties}
        >
          <HomeV2Button
            href="#planos"
            size="lg"
            arrow
            className="w-full sm:w-auto"
            onClick={() => trackHomeV2HeroCta('final')}
          >
            {finalCta.cta}
          </HomeV2Button>
          <p className="text-sm text-mesa-ash">{finalCta.support}</p>
        </div>
      </div>
    </section>
  );
}
