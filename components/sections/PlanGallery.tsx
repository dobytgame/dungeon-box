'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';

interface Props {
  planName: string;
  images: string[];
  priority?: boolean;
}

const MAX_THUMBNAILS = 3;

export default function PlanGallery({
  planName,
  images,
  priority = false,
}: Props) {
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());

  const gallery = images.filter((url) => url && !failedUrls.has(url));
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const markImageFailed = useCallback((url: string) => {
    setFailedUrls((current) => {
      if (current.has(url)) return current;
      const next = new Set(current);
      next.add(url);
      return next;
    });
  }, []);
  const activeImage = gallery[activeIndex] ?? gallery[0];

  useEffect(() => {
    if (activeIndex >= gallery.length && gallery.length > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, gallery.length]);

  const hasMultiple = gallery.length > 1;

  const goNext = useCallback(() => {
    if (!hasMultiple) return;
    setActiveIndex((index) => (index + 1) % gallery.length);
  }, [gallery.length, hasMultiple]);

  const goPrev = useCallback(() => {
    if (!hasMultiple) return;
    setActiveIndex((index) => (index - 1 + gallery.length) % gallery.length);
  }, [gallery.length, hasMultiple]);

  const openLightbox = useCallback((index?: number) => {
    if (typeof index === 'number') setActiveIndex(index);
    setLightboxOpen(true);
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setLightboxOpen(false);
      if (event.key === 'ArrowRight') goNext();
      if (event.key === 'ArrowLeft') goPrev();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightboxOpen, goNext, goPrev]);

  if (!activeImage) return null;

  return (
    <>
      <div className="group relative overflow-hidden rounded-sm border border-white/[0.1] shadow-[0_32px_80px_rgba(0,0,0,0.45)]">
        <button
          type="button"
          onClick={() => openLightbox()}
          className="relative block w-full cursor-zoom-in text-left"
          aria-label={`Ampliar foto do plano ${planName}`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeImage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="relative z-10"
            >
              <Image
                src={activeImage}
                alt={`Plano ${planName} — foto ${activeIndex + 1}`}
                width={2528}
                height={1686}
                priority={priority && activeIndex === 0}
                className="h-auto w-full object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
                onError={() => markImageFailed(activeImage)}
              />
            </motion.div>
          </AnimatePresence>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-950/40 via-transparent to-transparent" />

          <span className="absolute bottom-3 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-sm border border-white/10 bg-stone-950/80 text-stone-300 opacity-0 transition group-hover:opacity-100">
            <ZoomIn className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>

        {hasMultiple ? (
          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
            {gallery.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`rounded-full transition-all ${
                  index === activeIndex
                    ? 'h-2 w-6 bg-ember'
                    : 'h-2 w-2 bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Ir para foto ${index + 1}`}
                aria-current={index === activeIndex}
              />
            ))}
          </div>
        ) : null}

        {hasMultiple ? (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goPrev();
              }}
              className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm border border-white/10 bg-stone-950/80 text-white opacity-0 transition hover:bg-stone-950 group-hover:opacity-100"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goNext();
              }}
              className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm border border-white/10 bg-stone-950/80 text-white opacity-0 transition hover:bg-stone-950 group-hover:opacity-100"
              aria-label="Próxima foto"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}
      </div>

      {hasMultiple ? (
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {gallery.slice(0, MAX_THUMBNAILS).map((url, index) => (
            <li key={`${url}-${index}`}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                onDoubleClick={() => openLightbox(index)}
                className={`block w-full overflow-hidden rounded-sm border transition ${
                  index === activeIndex
                    ? 'border-ember/60 ring-1 ring-ember/30'
                    : 'border-white/[0.08] hover:border-white/20'
                }`}
                aria-label={`Ver foto ${index + 1} do plano ${planName}`}
                aria-current={index === activeIndex}
              >
                <Image
                  src={url}
                  alt=""
                  width={400}
                  height={267}
                  className="aspect-[3/2] w-full object-cover"
                  sizes="120px"
                  onError={() => markImageFailed(url)}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {mounted
        ? createPortal(
            <AnimatePresence>
              {lightboxOpen ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-[var(--z-lightbox)] h-[100dvh] w-screen"
                  role="dialog"
                  aria-modal="true"
                  aria-label={`Galeria do plano ${planName}`}
                >
                  <button
                    type="button"
                    onClick={() => setLightboxOpen(false)}
                    className="absolute inset-0 cursor-pointer bg-black/80 backdrop-blur-md"
                    aria-label="Fechar galeria"
                  />

                  <button
                    type="button"
                    onClick={() => setLightboxOpen(false)}
                    className="absolute right-4 top-4 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-sm border border-white/10 bg-stone-950/80 text-white transition hover:bg-stone-900 sm:right-6 sm:top-6"
                    aria-label="Fechar"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  {hasMultiple ? (
                    <>
                      <button
                        type="button"
                        onClick={goPrev}
                        className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm border border-white/10 bg-stone-950/80 text-white transition hover:bg-stone-900 sm:left-6"
                        aria-label="Foto anterior"
                      >
                        <ChevronLeft className="h-6 w-6" />
                      </button>
                      <button
                        type="button"
                        onClick={goNext}
                        className="absolute right-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm border border-white/10 bg-stone-950/80 text-white transition hover:bg-stone-900 sm:right-6"
                        aria-label="Próxima foto"
                      >
                        <ChevronRight className="h-6 w-6" />
                      </button>
                    </>
                  ) : null}

                  <div className="pointer-events-none relative flex h-full w-full items-center justify-center px-14 py-16 sm:px-20 sm:py-20">
                    <div className="pointer-events-auto flex max-h-full max-w-full flex-col items-center">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={activeImage}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{ duration: 0.25 }}
                          className="flex max-h-[calc(100dvh-8rem)] max-w-[min(100vw-7rem,1200px)] items-center justify-center"
                        >
                          <Image
                            src={activeImage}
                            alt={`Plano ${planName} — foto ${activeIndex + 1}`}
                            width={2528}
                            height={1686}
                            className="max-h-[calc(100dvh-8rem)] w-auto max-w-full object-contain"
                            sizes="100vw"
                            priority
                            onError={() => markImageFailed(activeImage)}
                          />
                        </motion.div>
                      </AnimatePresence>

                      {hasMultiple ? (
                        <p className="mt-4 font-display text-xs uppercase tracking-[0.2em] text-stone-400">
                          {activeIndex + 1} / {gallery.length}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}
    </>
  );
}
