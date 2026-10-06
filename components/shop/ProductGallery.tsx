'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import StoreMediaImage from '@/components/store/StoreMediaImage';
import {
  STORE_PRODUCT_IMAGE_SIZE,
  storeProductImageClassName,
  storeProductThumbClassName,
} from '@/lib/store/product-media';

interface Props {
  name: string;
  images: string[];
}

const SWIPE_THRESHOLD_PX = 48;

export default function ProductGallery({ name, images }: Props) {
  const gallery = images.length > 0 ? images : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeImage = gallery[activeIndex];

  const goNext = useCallback(() => {
    if (gallery.length <= 1) return;
    setActiveIndex((index) => (index + 1) % gallery.length);
  }, [gallery.length]);

  const goPrev = useCallback(() => {
    if (gallery.length <= 1) return;
    setActiveIndex((index) => (index - 1 + gallery.length) % gallery.length);
  }, [gallery.length]);

  useEffect(() => {
    thumbRefs.current[activeIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [activeIndex]);

  function handleTouchStart(clientX: number) {
    touchStartX.current = clientX;
    touchDeltaX.current = 0;
  }

  function handleTouchMove(clientX: number) {
    if (touchStartX.current === null) return;
    touchDeltaX.current = clientX - touchStartX.current;
  }

  function handleTouchEnd() {
    if (touchStartX.current === null) return;

    if (touchDeltaX.current > SWIPE_THRESHOLD_PX) {
      goPrev();
    } else if (touchDeltaX.current < -SWIPE_THRESHOLD_PX) {
      goNext();
    }

    touchStartX.current = null;
    touchDeltaX.current = 0;
  }

  useEffect(() => {
    if (!lightboxOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setLightboxOpen(false);
      if (event.key === 'ArrowRight') goNext();
      if (event.key === 'ArrowLeft') goPrev();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxOpen, goNext, goPrev]);

  if (gallery.length === 0) {
    return (
      <div className="home-v2-grid flex aspect-square items-center justify-center rounded-2xl border border-white/10 bg-mesa-stone text-sm text-mesa-ash">
        Sem imagem
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div
        className="group relative touch-pan-y overflow-hidden rounded-2xl border border-white/10 bg-mesa-stone"
        onTouchStart={(event) => handleTouchStart(event.touches[0]?.clientX ?? 0)}
        onTouchMove={(event) => handleTouchMove(event.touches[0]?.clientX ?? 0)}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <StoreMediaImage
          src={activeImage}
          alt={name}
          width={STORE_PRODUCT_IMAGE_SIZE}
          height={STORE_PRODUCT_IMAGE_SIZE}
          sizes="(max-width: 1024px) 100vw, 560px"
          priority
          className={`${storeProductImageClassName} home-v2-media-zoom transition duration-500 ease-out group-hover:scale-[1.03]`}
          draggable={false}
        />

        {gallery.length > 1 ? (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-mesa-ink/70 text-mesa-parchment ring-1 ring-inset ring-white/15 backdrop-blur-md transition-opacity hover:bg-mesa-ink sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-mesa-ink/70 text-mesa-parchment ring-1 ring-inset ring-white/15 backdrop-blur-md transition-opacity hover:bg-mesa-ink sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              aria-label="Próxima imagem"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <p className="home-v2-display pointer-events-none absolute bottom-3 left-3 rounded-full bg-mesa-ink/75 px-3 py-1.5 text-[11px] tabular-nums tracking-[0.16em] text-mesa-parchment backdrop-blur-md sm:hidden">
              {activeIndex + 1} / {gallery.length}
            </p>
          </>
        ) : null}

        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="absolute bottom-3 right-3 flex size-11 cursor-pointer items-center justify-center rounded-full bg-mesa-ink/70 text-mesa-parchment ring-1 ring-inset ring-white/15 backdrop-blur-md transition-colors hover:bg-mesa-ink"
          aria-label="Ampliar imagem"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>

      {gallery.length > 1 ? (
        <div className="relative mt-4">
          <ul
            className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Miniaturas da galeria"
          >
            {gallery.map((url, index) => (
              <li key={url} className="w-[4.5rem] shrink-0 snap-center sm:w-[5rem]">
                <button
                  ref={(element) => {
                    thumbRefs.current[index] = element;
                  }}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`block w-full cursor-pointer overflow-hidden rounded-lg border transition-[border-color,opacity] duration-200 ${
                    index === activeIndex
                      ? 'border-mesa-parchment'
                      : 'border-white/10 opacity-60 hover:border-white/30 hover:opacity-100'
                  }`}
                  aria-label={`Ver imagem ${index + 1}`}
                  aria-current={index === activeIndex}
                >
                  <StoreMediaImage
                    src={url}
                    alt=""
                    width={STORE_PRODUCT_IMAGE_SIZE}
                    height={STORE_PRODUCT_IMAGE_SIZE}
                    sizes="80px"
                    className={storeProductThumbClassName}
                    draggable={false}
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {lightboxOpen ? (
        <div
          className="home-v2-overlay fixed inset-0 z-[100] flex items-center justify-center bg-mesa-ink/95 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Galeria de ${name}`}
          onTouchStart={(event) => handleTouchStart(event.touches[0]?.clientX ?? 0)}
          onTouchMove={(event) => handleTouchMove(event.touches[0]?.clientX ?? 0)}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/[0.06] text-mesa-parchment ring-1 ring-inset ring-white/15 transition-colors hover:bg-white/[0.12]"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>

          {gallery.length > 1 ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-4 top-1/2 z-10 flex size-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-mesa-ink/70 text-mesa-parchment ring-1 ring-inset ring-white/15 transition-colors hover:bg-mesa-ink"
                aria-label="Imagem anterior"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-4 top-1/2 z-10 flex size-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-mesa-ink/70 text-mesa-parchment ring-1 ring-inset ring-white/15 transition-colors hover:bg-mesa-ink"
                aria-label="Próxima imagem"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}

          <StoreMediaImage
            src={activeImage}
            alt={name}
            width={STORE_PRODUCT_IMAGE_SIZE}
            height={STORE_PRODUCT_IMAGE_SIZE}
            sizes="90vw"
            className="max-h-[85vh] max-w-[min(100%,85vh)] object-contain"
            draggable={false}
          />
        </div>
      ) : null}
    </div>
  );
}
