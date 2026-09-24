'use client';

import { useCallback, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Quote, X } from 'lucide-react';
import StoreMediaImage from '@/components/store/StoreMediaImage';
import HomeV2Stars from '@/components/home-v2/HomeV2Stars';
import { useHomeV2Dialog } from '@/components/home-v2/useHomeV2Dialog';
import type { HomeV2Testimonial } from '@/lib/home-v2/content';

interface Props {
  testimonials: HomeV2Testimonial[];
  initialIndex: number;
  onClose: () => void;
}

export default function HomeV2TestimonialViewer({ testimonials, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [photo, setPhoto] = useState(0);
  const total = testimonials.length;
  const item = testimonials[index];

  const go = useCallback(
    (delta: number) => {
      setIndex((current) => (current + delta + total) % total);
      setPhoto(0);
    },
    [total]
  );

  const { dialogRef, initialFocusRef } = useHomeV2Dialog<HTMLButtonElement>(onClose, (event) => {
    if (event.key === 'ArrowRight') go(1);
    if (event.key === 'ArrowLeft') go(-1);
  });

  const touchStart = useRef<{ x: number; y: number } | null>(null);

  if (!item) return null;
  const photos = item.imageUrls;
  const hasPhotos = photos.length > 0;

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        tabIndex={-1}
        className="home-v2-overlay absolute inset-0 cursor-pointer bg-black/80 backdrop-blur-sm"
        aria-label="Fechar avaliações"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Avaliação de ${item.name}`}
        className="home-v2-sheet absolute inset-x-0 bottom-0 flex max-h-[92svh] flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-mesa-stone shadow-[0_-20px_60px_rgba(0,0,0,0.5)] md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[86vh] md:w-[min(64rem,calc(100vw-3rem))] md:rounded-3xl"
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-3 md:px-6">
          <p className="home-v2-display text-[11px] tracking-[0.22em] text-mesa-jade" aria-live="polite">
            Avaliação {index + 1} de {total}
          </p>
          <button
            ref={initialFocusRef}
            type="button"
            onClick={onClose}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-white/15 text-mesa-parchment transition-colors hover:border-white/40 hover:bg-white/5"
            aria-label="Fechar"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="grid flex-1 overflow-y-auto overscroll-contain md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:overflow-hidden">
          <div
            className="relative bg-mesa-ink"
            onTouchStart={(event) => {
              const touch = event.touches[0];
              touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
            }}
            onTouchEnd={(event) => {
              const start = touchStart.current;
              const touch = event.changedTouches[0];
              touchStart.current = null;
              if (!start || !touch || total < 2) return;
              const dx = touch.clientX - start.x;
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(touch.clientY - start.y)) go(dx < 0 ? 1 : -1);
            }}
          >
            {hasPhotos ? (
              <div className="flex h-full flex-col">
                <div className="relative aspect-[4/3] w-full md:aspect-auto md:min-h-[26rem] md:flex-1">
                  <div className="home-v2-grid absolute inset-0" aria-hidden="true" />
                  <StoreMediaImage
                    key={photos[photo]}
                    src={photos[photo] ?? photos[0]}
                    alt={`Foto ${photo + 1} da mesa de ${item.name}`}
                    fill
                    priority
                    sizes="(min-width: 768px) 55vw, 100vw"
                    className="home-v2-overlay absolute inset-0 size-full object-contain"
                  />
                </div>
                {photos.length > 1 ? (
                  <ul className="flex gap-2 overflow-x-auto border-t border-white/10 p-3" aria-label="Fotos da avaliação">
                    {photos.map((src, photoIndex) => (
                      <li key={src} className="shrink-0">
                        <button
                          type="button"
                          onClick={() => setPhoto(photoIndex)}
                          aria-label={`Ver foto ${photoIndex + 1}`}
                          aria-current={photoIndex === photo ? 'true' : undefined}
                          className={`relative block size-16 cursor-pointer overflow-hidden rounded-lg border-2 transition-[border-color,opacity] duration-200 ${
                            photoIndex === photo
                              ? 'border-mesa-jade'
                              : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <StoreMediaImage src={src} alt="" fill sizes="64px" className="object-cover" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <div className="relative flex aspect-[4/3] h-full items-center justify-center md:aspect-auto md:min-h-[26rem]">
                <div className="home-v2-grid absolute inset-0" aria-hidden="true" />
                <Quote aria-hidden="true" className="relative size-20 text-mesa-jade/30" strokeWidth={1.25} />
              </div>
            )}
          </div>

          <div className="flex flex-col p-6 md:overflow-y-auto md:p-8">
            <HomeV2Stars value={item.rating} size="lg" />
            <blockquote className="mt-5 flex-1">
              <p className="whitespace-pre-line text-base leading-relaxed text-mesa-parchment md:text-lg">
                “{item.quote}”
              </p>
            </blockquote>
            <p className="mt-6 flex items-center gap-3 border-t border-white/10 pt-5 text-sm text-mesa-ash">
              <span
                aria-hidden="true"
                className="flex size-10 items-center justify-center rounded-full bg-mesa-jade/10 text-sm font-semibold text-mesa-jade"
              >
                {item.name.charAt(0).toUpperCase()}
              </span>
              <span>
                <span className="block font-semibold text-mesa-parchment">{item.name}</span>
                {item.context ? <span className="block">Tema: {item.context}</span> : null}
              </span>
            </p>
          </div>
        </div>

        {total > 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6">
            <button
              type="button"
              onClick={() => go(-1)}
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm text-mesa-ash transition-colors hover:bg-white/5 hover:text-mesa-parchment"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
              Anterior
            </button>
            <div className="hidden items-center gap-1.5 sm:flex" aria-hidden="true">
              {testimonials.map((entry, dotIndex) => (
                <span
                  key={entry.id}
                  className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${
                    dotIndex === index ? 'w-6 bg-mesa-jade' : 'w-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => go(1)}
              className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm text-mesa-ash transition-colors hover:bg-white/5 hover:text-mesa-parchment"
            >
              Próxima
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
