'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, ZoomIn } from 'lucide-react';
import AnimatedSection from '@/components/ui/AnimatedSection';
import ImageLightbox from '@/components/ui/ImageLightbox';
import StoreMediaImage from '@/components/store/StoreMediaImage';
import type { PublicTestimonial } from '@/lib/feedback/public';

const AUTO_ADVANCE_MS = 8000;
/** Altura fixa do card — evita “pulo” entre slides */
const SLIDE_CARD_CLASS = 'h-[32rem] md:h-[25rem]';
const THUMB_ROW_CLASS = 'h-[4.5rem] shrink-0';

interface Props {
  testimonials: PublicTestimonial[];
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={`${rating} de 5 estrelas`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${
            index < rating ? 'fill-gold text-gold' : 'fill-stone-800 text-stone-700'
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function TestimonialSlide({
  item,
  slideIndex,
  onOpenLightbox,
}: {
  item: PublicTestimonial;
  slideIndex: number;
  onOpenLightbox: (urls: string[], imageIndex: number) => void;
}) {
  const hasImages = item.imageUrls.length > 0;
  const extraImages = item.imageUrls.slice(1, 4);
  const slideLabel = String(slideIndex + 1).padStart(2, '0');

  return (
    <blockquote
      className={`relative overflow-hidden rounded-sm border border-white/[0.08] bg-stone-900/45 shadow-[0_40px_100px_rgba(0,0,0,0.35)] ${SLIDE_CARD_CLASS}`}
    >
      <span
        className="pointer-events-none absolute -right-2 top-2 select-none font-display text-[clamp(5rem,18vw,11rem)] leading-none text-ember/10"
        aria-hidden="true"
      >
        &ldquo;
      </span>
      <span
        className="pointer-events-none absolute bottom-[-0.12em] left-4 select-none font-display text-[clamp(4rem,14vw,9rem)] uppercase leading-none tracking-tighter text-white/[0.04]"
        aria-hidden="true"
      >
        {slideLabel}
      </span>

      <div
        className={`relative z-10 h-full ${
          hasImages
            ? 'grid grid-rows-[minmax(0,14rem)_minmax(0,18rem)] md:grid-cols-2 md:grid-rows-1'
            : 'flex flex-col'
        }`}
      >
        <div
          className={`flex min-h-0 flex-col p-6 md:p-8 lg:p-10 ${
            hasImages ? 'border-b border-white/[0.06] md:border-b-0 md:border-r' : 'h-full'
          }`}
        >
          <StarRating rating={item.rating} />

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15">
            <p
              className={`leading-relaxed text-stone-200 ${
                hasImages
                  ? 'text-base md:text-lg md:leading-relaxed'
                  : 'text-lg md:text-xl lg:text-2xl md:leading-relaxed lg:max-w-4xl'
              }`}
            >
              &ldquo;{item.message}&rdquo;
            </p>
          </div>

          <footer className="mt-4 shrink-0 border-t border-white/[0.06] pt-4">
            <cite className="not-italic">
              <span className="block font-display text-sm uppercase tracking-wide text-white md:text-base">
                {item.name}
              </span>
              {item.themeName ? (
                <span className="mt-1 block text-xs text-stone-500 md:text-sm">
                  Ciclo · {item.themeName}
                </span>
              ) : (
                <span className="mt-1 block text-xs text-stone-600 md:text-sm">Assinante</span>
              )}
            </cite>
          </footer>
        </div>

        {hasImages ? (
          <div className="flex min-h-0 flex-col">
            <div className="relative min-h-0 flex-1 overflow-hidden bg-stone-950">
              <button
                type="button"
                onClick={() => onOpenLightbox(item.imageUrls, 0)}
                className="group/photo relative block h-full w-full cursor-zoom-in overflow-hidden text-left"
                aria-label="Ampliar foto do depoimento"
              >
                <StoreMediaImage
                  src={item.imageUrls[0]}
                  alt="Foto enviada pelo assinante"
                  fill
                  sizes="(max-width: 768px) 100vw, 420px"
                  className="object-cover transition duration-300 group-hover/photo:scale-[1.03]"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-950/60 via-stone-950/10 to-transparent"
                  aria-hidden="true"
                />
                <span className="absolute bottom-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-sm border border-white/10 bg-stone-950/80 text-stone-200">
                  <ZoomIn className="h-4 w-4" aria-hidden="true" />
                </span>
              </button>
            </div>

            <div
              className={`${THUMB_ROW_CLASS} flex items-center gap-2 overflow-x-auto border-t border-white/[0.06] px-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
            >
              {extraImages.length > 0
                ? extraImages.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => onOpenLightbox(item.imageUrls, index + 1)}
                      className="relative h-12 w-16 shrink-0 cursor-zoom-in overflow-hidden rounded-sm border border-white/[0.08] bg-stone-900 transition hover:border-ember/30"
                      aria-label={`Ampliar foto adicional ${index + 2}`}
                    >
                      <StoreMediaImage
                        src={url}
                        alt={`Foto adicional ${index + 2}`}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </button>
                  ))
                : null}
            </div>
          </div>
        ) : null}
      </div>
    </blockquote>
  );
}

export default function DepoimentosGrid({ testimonials }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightbox, setLightbox] = useState<{
    images: string[];
    index: number;
  } | null>(null);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();

  const total = testimonials.length;
  const current = testimonials[activeIndex] ?? testimonials[0];
  const hasMultiple = total > 1;

  const average =
    total > 0
      ? Math.round(
          (testimonials.reduce((sum, item) => sum + item.rating, 0) / total) * 10
        ) / 10
      : null;

  const goTo = useCallback(
    (index: number) => {
      if (total === 0) return;
      setActiveIndex(((index % total) + total) % total);
    },
    [total]
  );

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  useEffect(() => {
    if (!hasMultiple || reducedMotion || paused || lightbox) return;

    const timer = window.setInterval(goNext, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [hasMultiple, reducedMotion, paused, lightbox, goNext]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (lightbox) return;
      if (event.key === 'ArrowRight') goNext();
      if (event.key === 'ArrowLeft') goPrev();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goNext, goPrev, lightbox]);

  if (!current) return null;

  return (
    <section
      id="depoimentos"
      className="relative overflow-hidden bg-stone-950 bg-grid px-6 py-24 noise md:py-32"
      aria-labelledby="depoimentos-title"
      aria-roledescription="carrossel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <p className="absolute left-[-4%] top-[12%] select-none font-display text-[clamp(4rem,16vw,12rem)] uppercase leading-none tracking-tighter text-ember opacity-[0.04]">
          Vozes
        </p>
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        <AnimatedSection>
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-display text-xs uppercase tracking-[0.35em] text-ember">
              Depoimentos
            </p>
            <h2
              id="depoimentos-title"
              className="mt-3 font-display text-4xl uppercase leading-[0.95] tracking-wide text-white md:text-5xl"
            >
              Quem já abriu a caixa
              <br />
              <span className="text-gradient-ember">conta a história.</span>
            </h2>
            {average ? (
              <p className="mt-5 text-sm text-stone-400">
                Média{' '}
                <span className="font-display text-base text-gold">{average}</span> de 5 entre
                assinantes em destaque
              </p>
            ) : null}
          </div>
        </AnimatedSection>

        <div className="relative mt-14">
          {hasMultiple ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute -left-1 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm border border-white/10 bg-stone-950/90 text-white transition hover:border-ember/30 hover:bg-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember md:flex lg:-left-6"
                aria-label="Depoimento anterior"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute -right-1 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm border border-white/10 bg-stone-950/90 text-white transition hover:border-ember/30 hover:bg-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember md:flex lg:-right-6"
                aria-label="Próximo depoimento"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          ) : null}

          <div
            className={SLIDE_CARD_CLASS}
            aria-live="polite"
            aria-atomic="true"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.id}
                initial={{
                  opacity: 0,
                  x: reducedMotion ? 0 : 28,
                }}
                animate={{ opacity: 1, x: 0 }}
                exit={{
                  opacity: 0,
                  x: reducedMotion ? 0 : -28,
                }}
                transition={{ duration: reducedMotion ? 0.01 : 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <TestimonialSlide
                  item={current}
                  slideIndex={activeIndex}
                  onOpenLightbox={(images, imageIndex) =>
                    setLightbox({ images, index: imageIndex })
                  }
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {hasMultiple ? (
            <div className="mt-8 flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
              <div className="flex items-center gap-3 md:hidden">
                <button
                  type="button"
                  onClick={goPrev}
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-sm border border-white/10 bg-stone-950/90 text-white transition hover:border-ember/30"
                  aria-label="Depoimento anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-sm border border-white/10 bg-stone-950/90 text-white transition hover:border-ember/30"
                  aria-label="Próximo depoimento"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div
                className="flex flex-wrap items-center justify-center gap-2"
                role="tablist"
                aria-label="Selecionar depoimento"
              >
                {testimonials.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={index === activeIndex}
                    aria-label={`Depoimento ${index + 1} de ${total}`}
                    onClick={() => goTo(index)}
                    className={`cursor-pointer rounded-full transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${
                      index === activeIndex
                        ? 'h-2.5 w-8 bg-ember'
                        : 'h-2.5 w-2.5 bg-white/25 hover:bg-white/45'
                    }`}
                  />
                ))}
              </div>

              <p className="font-display text-xs uppercase tracking-[0.25em] text-stone-500">
                {String(activeIndex + 1).padStart(2, '0')}{' '}
                <span className="text-stone-700">/</span>{' '}
                {String(total).padStart(2, '0')}
              </p>
            </div>
          ) : null}
        </div>

        <AnimatedSection delay={0.1}>
          <p className="mt-12 text-center text-xs text-stone-600">
            Depoimentos reais de assinantes, publicados com autorização.
          </p>
        </AnimatedSection>
      </div>

      <ImageLightbox
        images={lightbox?.images ?? []}
        initialIndex={lightbox?.index ?? 0}
        open={lightbox !== null}
        onClose={() => setLightbox(null)}
        altPrefix="Foto do depoimento"
      />
    </section>
  );
}
