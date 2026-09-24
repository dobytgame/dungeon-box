'use client';

import { useState } from 'react';
import { MessageCircle, Plus } from 'lucide-react';
import HomeV2SectionHeading from '@/components/home-v2/HomeV2SectionHeading';
import { COMPANY } from '@/lib/legal/constants';
import { HOME_V2_COPY, HOME_V2_FAQ } from '@/lib/home-v2/content';
import { trackHomeV2FaqOpened } from '@/lib/home-v2/analytics';

export default function HomeV2Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const { faq } = HOME_V2_COPY;

  return (
    <section
      id="faq"
      className="bg-mesa-stone px-4 py-20 sm:px-6 md:py-28"
      aria-labelledby="home-v2-faq-title"
    >
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] md:gap-16">
        <div className="md:sticky md:top-28 md:self-start">
          <HomeV2SectionHeading
            eyebrow={faq.eyebrow}
            title={faq.title}
            titleId="home-v2-faq-title"
            support={faq.support}
          />
          <div className="home-v2-reveal mt-8 hidden rounded-2xl border border-white/10 bg-mesa-ink/60 p-5 md:block">
            <p className="text-sm text-mesa-parchment">{faq.cancelNote}</p>
            <p className="mt-3 border-t border-white/10 pt-3 text-sm text-mesa-ash">{faq.contactLead}</p>
            <a
              href={COMPANY.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-mesa-parchment underline-offset-4 transition-colors hover:text-mesa-jade hover:underline"
            >
              <MessageCircle aria-hidden="true" className="size-4 text-mesa-jade" />
              {faq.contactCta}
            </a>
          </div>
        </div>

        <div className="home-v2-reveal divide-y divide-white/10 border-y border-white/10">
          {HOME_V2_FAQ.map((item, index) => {
            const open = openIndex === index;
            const buttonId = `home-v2-faq-button-${index}`;
            const panelId = `home-v2-faq-panel-${index}`;

            return (
              <div key={item.q}>
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    className="group flex min-h-16 w-full cursor-pointer items-center gap-4 py-5 text-left md:gap-5"
                    onClick={() => {
                      const next = open ? null : index;
                      setOpenIndex(next);
                      if (next !== null) trackHomeV2FaqOpened(item.q);
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className={`home-v2-display w-6 shrink-0 text-xs tabular-nums tracking-[0.2em] transition-colors ${
                        open ? 'text-mesa-ember' : 'text-mesa-ash/60'
                      }`}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={`flex-1 text-base transition-colors ${
                        open ? 'text-mesa-parchment' : 'text-mesa-parchment/80 group-hover:text-mesa-parchment'
                      }`}
                    >
                      {item.q}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`flex size-9 shrink-0 items-center justify-center rounded-full border transition-[transform,border-color,background-color] duration-200 ${
                        open
                          ? 'rotate-45 border-mesa-jade/50 bg-mesa-jade/10 text-mesa-jade'
                          : 'border-white/15 text-mesa-ash group-hover:border-white/35'
                      }`}
                    >
                      <Plus className="size-4" />
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!open}
                >
                  <p className="home-v2-faq-answer max-w-2xl pb-5 pl-10 pr-12 text-sm md:pl-11 leading-relaxed text-mesa-ash">
                    {item.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <a
          href={COMPANY.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-mesa-ash md:hidden"
        >
          <MessageCircle aria-hidden="true" className="size-4 text-mesa-jade" />
          {faq.contactLead}{' '}
          <span className="font-semibold text-mesa-parchment underline underline-offset-4">
            {faq.contactCta}
          </span>
        </a>
      </div>
    </section>
  );
}
