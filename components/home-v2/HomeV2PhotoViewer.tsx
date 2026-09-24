'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import HomeV2Button from '@/components/home-v2/HomeV2Button';
import { useHomeV2Dialog } from '@/components/home-v2/useHomeV2Dialog';

interface Props {
  eyebrow: string;
  title: string;
  photos: Array<{ src: string; alt: string }>;
  initialIndex: number;
  onClose: () => void;
  cta?: { href: string; label: string; support?: string; onClick?: () => void };
  /** `sizes` already used for these photos on the page, so a cached copy shows while the large one loads. */
  previewSizes?: string;
}

export default function HomeV2PhotoViewer({
  eyebrow,
  title,
  photos,
  initialIndex,
  onClose,
  cta,
  previewSizes,
}: Props) {
  const [index, setIndex] = useState(initialIndex);
  const total = photos.length;
  const photo = photos[index];
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback(
    (delta: number) => setIndex((current) => (current + delta + total) % total),
    [total]
  );

  const { dialogRef, initialFocusRef } = useHomeV2Dialog<HTMLButtonElement>(onClose, (event) => {
    if (event.key === 'ArrowRight') go(1);
    if (event.key === 'ArrowLeft') go(-1);
  });

  if (!photo) return null;

  const arrowClass =
    'absolute top-1/2 z-10 flex size-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-mesa-ink/70 text-mesa-parchment backdrop-blur-md transition-colors duration-200 hover:border-white/40 hover:bg-mesa-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-mesa-ember';

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${eyebrow}: ${title}`}
      className="home-v2-overlay fixed inset-0 z-[80] flex flex-col bg-[#060708]/95 backdrop-blur-md"
    >
      <div className="flex items-center justify-between gap-4 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <div className="min-w-0">
          <p className="home-v2-display text-[11px] tracking-[0.22em] text-mesa-jade">{eyebrow}</p>
          <p className="home-v2-display mt-0.5 truncate text-xl leading-tight text-mesa-parchment">
            {title}
            <span className="ml-3 font-homeBody text-sm tabular-nums tracking-normal text-mesa-ash" aria-live="polite">
              {index + 1} de {total}
            </span>
          </p>
        </div>
        <button
          ref={initialFocusRef}
          type="button"
          onClick={onClose}
          aria-label="Fechar fotos"
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/15 text-mesa-parchment transition-colors hover:border-white/40 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mesa-ember"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>

      <div
        className="relative min-h-0 flex-1"
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
        <div className="home-v2-grid absolute inset-0 opacity-60" aria-hidden="true" />
        {previewSizes ? (
          <Image
            key={`preview-${photo.src}`}
            src={photo.src}
            alt=""
            fill
            sizes={previewSizes}
            className="object-contain"
          />
        ) : null}
        <Image
          key={photo.src}
          src={photo.src}
          alt={photo.alt}
          fill
          priority
          sizes="(min-width: 1280px) 1200px, 100vw"
          className="home-v2-overlay object-contain"
        />
        {total > 1 ? (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Foto anterior" className={`${arrowClass} left-3 sm:left-6`}>
              <ChevronLeft aria-hidden="true" className="size-6" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Próxima foto" className={`${arrowClass} right-3 sm:right-6`}>
              <ChevronRight aria-hidden="true" className="size-6" />
            </button>
          </>
        ) : null}
      </div>

      <div className="border-t border-white/10 bg-mesa-ink/80 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-6">
          {total > 1 ? (
            <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none]" aria-label="Miniaturas">
              {photos.map((item, photoIndex) => (
                <li key={item.src} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setIndex(photoIndex)}
                    aria-label={`Ver foto ${photoIndex + 1}`}
                    aria-current={photoIndex === index ? 'true' : undefined}
                    className={`relative block h-12 w-[4.5rem] cursor-pointer overflow-hidden rounded-md border-2 transition-[border-color,opacity] duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mesa-ember ${
                      photoIndex === index ? 'border-mesa-ember' : 'border-transparent opacity-55 hover:opacity-100'
                    }`}
                  >
                    <Image src={item.src} alt="" fill sizes="72px" className="object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <span />
          )}
          {cta ? (
            <div className="flex flex-col items-stretch gap-1.5 md:flex-row md:items-center md:gap-5">
              {cta.support ? (
                <p className="order-2 text-center text-xs text-mesa-ash md:order-1 md:text-right">{cta.support}</p>
              ) : null}
              <HomeV2Button href={cta.href} arrow className="order-1 w-full md:order-2 md:w-auto" onClick={cta.onClick}>
                {cta.label}
              </HomeV2Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
