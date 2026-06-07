'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, MessageCircleQuestion } from 'lucide-react';
import Link from 'next/link';
import { faqItems } from '@/lib/data';
import AnimatedSection from '@/components/ui/AnimatedSection';

export default function FAQ() {
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
              Dúvidas comuns
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
              cancelamento e compatibilidade.
            </p>
          </div>
        </AnimatedSection>

        <div
          className="mt-12 divide-y divide-white/[0.06] border-y border-white/[0.06]"
          role="list"
        >
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            const buttonId = `faq-button-${index}`;

            return (
              <div
                key={item.q}
                role="listitem"
                className={`relative transition-colors duration-200 ${
                  isOpen ? 'bg-stone-900/35' : 'hover:bg-white/[0.02]'
                }`}
              >
                <span
                  className={`absolute left-0 top-0 bottom-0 w-1 bg-ember transition-opacity duration-300 ${
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
                  <span
                    className={`mt-0.5 shrink-0 font-display text-xs tabular-nums tracking-[0.2em] transition-colors ${
                      isOpen ? 'text-ember' : 'text-stone-600'
                    }`}
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={`block font-display text-base uppercase leading-snug tracking-wide transition-colors md:text-lg ${
                        isOpen ? 'text-white' : 'text-stone-200'
                      }`}
                    >
                      {item.q}
                    </span>
                  </span>

                  <ChevronDown
                    className={`mt-1 h-5 w-5 shrink-0 text-stone-500 transition-transform duration-300 ${
                      isOpen ? 'rotate-180 text-ember' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      initial={reducedMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
                      transition={{
                        duration: reducedMotion ? 0 : 0.28,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-2xl pb-6 pl-12 pr-5 text-sm leading-relaxed text-stone-400 md:pl-14 md:pr-6 md:text-base">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="relative mt-10 overflow-hidden rounded-sm border-l-4 border-l-ember bg-gradient-to-r from-ember/10 to-transparent py-5 pl-5 pr-6 md:py-6 md:pl-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <MessageCircleQuestion
                className="mt-0.5 h-5 w-5 shrink-0 text-ember"
                aria-hidden="true"
              />
              <div>
                <p className="font-display text-sm uppercase tracking-wide text-white">
                  Ainda com dúvidas?
                </p>
                <p className="mt-1 text-sm leading-relaxed text-stone-400">
                  Pode cancelar quando quiser — sem carência, sem multa.
                </p>
              </div>
            </div>
            <Link
              href="#planos"
              className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-sm bg-ember px-5 py-2.5 font-display text-sm uppercase tracking-wide text-stone-950 transition-colors hover:bg-ember-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
            >
              Ver planos
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
