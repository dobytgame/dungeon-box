'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, MessageCircleQuestion } from 'lucide-react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import { launchFaqItems } from '@/lib/launch/data';

export default function LaunchFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const reducedMotion = useReducedMotion();

  return (
    <section
      id="faq"
      className="relative overflow-hidden bg-stone-950 bg-grid px-6 py-24 noise md:py-32"
      aria-labelledby="faq-title"
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <p className="absolute right-[-4%] top-[12%] select-none font-display text-[clamp(4rem,16vw,12rem)] uppercase leading-none tracking-tighter text-ember opacity-[0.04]">
          FAQ
        </p>
      </div>

      <div className="relative z-10 mx-auto max-w-3xl lg:max-w-4xl">
        <AnimatedSection>
          <div className="max-w-2xl border-b border-white/[0.06] pb-10">
            <p className="font-display text-xs uppercase tracking-[0.35em] text-ember">
              Dúvidas
            </p>
            <h2
              id="faq-title"
              className="mt-3 font-display text-4xl uppercase leading-[0.95] tracking-wide text-white md:text-5xl lg:text-6xl"
            >
              Perguntas
              <br />
              <span className="text-gradient-ember">frequentes</span>
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-stone-400">
              Tudo o que você precisa saber antes de assinar — encaixe, entrega,
              pagamento e compatibilidade.
            </p>
          </div>
        </AnimatedSection>

        <div
          className="mt-12 divide-y divide-white/[0.06] border-y border-white/[0.06]"
          role="list"
        >
          {launchFaqItems.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `launch-faq-panel-${index}`;
            const buttonId = `launch-faq-button-${index}`;

            return (
              <div
                key={item.q}
                role="listitem"
                className={`relative transition-colors duration-200 ${
                  isOpen ? 'bg-stone-900/35' : 'hover:bg-white/[0.02]'
                }`}
              >
                <span
                  className={`absolute bottom-0 left-0 top-0 w-1 bg-ember transition-opacity duration-300 ${
                    isOpen ? 'opacity-100' : 'opacity-0'
                  }`}
                  aria-hidden="true"
                />

                <button
                  id={buttonId}
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full cursor-pointer items-start gap-4 py-5 pl-5 pr-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ember md:gap-5 md:py-6 md:pl-6 md:pr-5"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                >
                  <MessageCircleQuestion
                    className={`mt-0.5 h-5 w-5 shrink-0 transition-colors ${
                      isOpen ? 'text-ember' : 'text-stone-500'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="flex-1 font-display text-lg uppercase tracking-wide text-white md:text-xl">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`mt-1 h-5 w-5 shrink-0 text-stone-500 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-ember' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen ? (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      initial={reducedMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 pl-14 text-sm leading-relaxed text-stone-400 md:px-6 md:pb-6 md:pl-[4.25rem] md:text-base">
                        {item.a}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
