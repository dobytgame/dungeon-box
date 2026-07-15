'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface Props {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
  altPrefix?: string;
}

export default function ImageLightbox({
  images,
  initialIndex = 0,
  open,
  onClose,
  altPrefix = 'Foto',
}: Props) {
  const gallery = images.filter(Boolean);
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) setActiveIndex(initialIndex);
  }, [open, initialIndex]);

  const hasMultiple = gallery.length > 1;
  const activeImage = gallery[activeIndex] ?? gallery[0];

  const goNext = useCallback(() => {
    if (!hasMultiple) return;
    setActiveIndex((index) => (index + 1) % gallery.length);
  }, [gallery.length, hasMultiple]);

  const goPrev = useCallback(() => {
    if (!hasMultiple) return;
    setActiveIndex((index) => (index - 1 + gallery.length) % gallery.length);
  }, [gallery.length, hasMultiple]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') goNext();
      if (event.key === 'ArrowLeft') goPrev();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, goNext, goPrev]);

  if (!mounted || !activeImage) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[var(--z-lightbox)] h-[100dvh] w-screen"
          role="dialog"
          aria-modal="true"
          aria-label="Visualização ampliada da foto"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute inset-0 cursor-pointer bg-black/80 backdrop-blur-md"
            aria-label="Fechar visualização"
          />

          <button
            type="button"
            onClick={onClose}
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeImage}
                    alt={`${altPrefix} ${activeIndex + 1}`}
                    className="max-h-[calc(100dvh-8rem)] w-auto max-w-full object-contain"
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
  );
}
