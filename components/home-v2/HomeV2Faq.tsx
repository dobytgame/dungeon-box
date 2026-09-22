'use client';

import { useState } from 'react';
import HomeV2Button from '@/components/home-v2/HomeV2Button';
import { HOME_V2_COPY, HOME_V2_FAQ } from '@/lib/home-v2/content';
import { trackHomeV2FaqOpened, trackHomeV2HeroCta } from '@/lib/home-v2/analytics';

export default function HomeV2Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="bg-mesa-stone px-4 py-16 sm:px-6 md:py-24"
      aria-labelledby="home-v2-faq-title"
    >
      <div className="mx-auto max-w-3xl">
        <h2
          id="home-v2-faq-title"
          className="home-v2-display text-[clamp(2rem,7vw,4rem)] leading-[0.92] text-mesa-parchment"
        >
          {HOME_V2_COPY.faq.title}
        </h2>

        <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
          {HOME_V2_FAQ.map((item, index) => {
            const open = openIndex === index;
            const buttonId = `home-v2-faq-button-${index}`;
            const panelId = `home-v2-faq-panel-${index}`;

            return (
              <div key={item.q}>
                <button
                  id={buttonId}
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 py-4 text-left"
                  onClick={() => {
                    const next = open ? null : index;
                    setOpenIndex(next);
                    if (next !== null) trackHomeV2FaqOpened(item.q);
                  }}
                >
                  <span className="text-base text-mesa-parchment">{item.q}</span>
                  <span aria-hidden="true" className="text-mesa-ash">
                    {open ? '−' : '+'}
                  </span>
                </button>
                {open ? (
                  <p
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="pb-5 text-sm leading-relaxed text-mesa-ash"
                  >
                    {item.a}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-10">
          <HomeV2Button
            href="#planos"
            size="lg"
            onClick={() => trackHomeV2HeroCta('faq')}
          >
            {HOME_V2_COPY.faq.cta}
          </HomeV2Button>
          <p className="mt-3 text-sm text-mesa-ash">{HOME_V2_COPY.faq.support}</p>
        </div>
      </div>
    </section>
  );
}
