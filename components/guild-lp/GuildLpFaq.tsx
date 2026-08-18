'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import GuildLpMark from '@/components/guild-lp/GuildLpMark';
import { guildLpCopy } from '@/lib/guild-lp/copy';

export default function GuildLpFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="scroll-mt-24 border-t border-white/[0.06] bg-relic-surface px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      aria-labelledby="faq-title"
    >
      <div className="mx-auto max-w-3xl">
        <p className="flex items-center gap-2 font-cinzel text-[11px] font-semibold uppercase tracking-[0.28em] text-relic-gold">
          <GuildLpMark className="h-2.5 w-2.5" />
          {guildLpCopy.faqEyebrow}
        </p>
        <h2
          id="faq-title"
          className="mt-4 font-cinzel text-[clamp(1.75rem,4vw,2.75rem)] font-bold uppercase leading-[0.95] tracking-wide text-relic-parchment"
        >
          {guildLpCopy.faqHeadline}
        </h2>

        <div
          className="mt-10 divide-y divide-white/[0.06] border-y border-white/[0.06]"
          role="list"
        >
          {guildLpCopy.faqItems.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `guild-faq-panel-${index}`;
            const buttonId = `guild-faq-button-${index}`;

            return (
              <div key={item.q} className="relative" role="listitem">
                <span
                  className={`absolute bottom-0 left-0 top-0 w-0.5 bg-relic-gold transition-opacity duration-200 ${
                    isOpen ? 'opacity-100' : 'opacity-0'
                  }`}
                  aria-hidden="true"
                />
                <button
                  id={buttonId}
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex min-h-11 w-full cursor-pointer items-start gap-4 py-5 pl-5 pr-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-relic-gold"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                >
                  <span className="flex-1 font-cinzel text-base font-semibold uppercase tracking-wide text-relic-parchment sm:text-lg">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`mt-1 h-5 w-5 shrink-0 text-relic-muted transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-relic-gold' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!isOpen}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-base leading-[1.7] text-relic-muted">
                    {item.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
