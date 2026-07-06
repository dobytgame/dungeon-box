'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import {
  STORE_PRODUCT_IMAGE_SIZE,
  storeProductImageClassName,
  storeProductThumbClassName,
} from '@/lib/store/product-media';

interface Props {
  name: string;
  images: string[];
}

export default function ProductGallery({ name, images }: Props) {
  const gallery = images.length > 0 ? images : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

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
      <div className="flex aspect-square items-center justify-center rounded-sm border border-white/[0.08] bg-stone-900/40 text-sm text-stone-600">
        Sem imagem
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <div className="group relative overflow-hidden rounded-sm border border-white/[0.08] bg-stone-950/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeImage}
          alt={name}
          width={STORE_PRODUCT_IMAGE_SIZE}
          height={STORE_PRODUCT_IMAGE_SIZE}
          className={`${storeProductImageClassName} transition duration-300 group-hover:scale-[1.02]`}
        />

        {gallery.length > 1 ? (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm border border-white/10 bg-stone-950/80 text-white opacity-0 transition group-hover:opacity-100"
              aria-label="Imagem anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm border border-white/10 bg-stone-950/80 text-white opacity-0 transition group-hover:opacity-100"
              aria-label="Próxima imagem"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        ) : null}

        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="absolute bottom-3 right-3 flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm border border-white/10 bg-stone-950/80 text-stone-300 transition hover:text-white"
          aria-label="Ampliar imagem"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
      </div>

      {gallery.length > 1 ? (
        <ul className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-4 lg:grid-cols-5">
          {gallery.map((url, index) => (
            <li key={url}>
              <button
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`block w-full overflow-hidden rounded-sm border transition ${
                  index === activeIndex
                    ? 'border-ember/60 ring-1 ring-ember/30'
                    : 'border-white/[0.08] hover:border-white/20'
                }`}
                aria-label={`Ver imagem ${index + 1}`}
                aria-current={index === activeIndex}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  width={STORE_PRODUCT_IMAGE_SIZE}
                  height={STORE_PRODUCT_IMAGE_SIZE}
                  className={storeProductThumbClassName}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {lightboxOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Galeria de ${name}`}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm border border-white/10 text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>

          {gallery.length > 1 ? (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm border border-white/10 bg-stone-950/60 text-white"
                aria-label="Imagem anterior"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-sm border border-white/10 bg-stone-950/60 text-white"
                aria-label="Próxima imagem"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeImage}
            alt={name}
            width={STORE_PRODUCT_IMAGE_SIZE}
            height={STORE_PRODUCT_IMAGE_SIZE}
            className="max-h-[85vh] max-w-[min(100%,85vh)] object-contain"
          />
        </div>
      ) : null}
    </div>
  );
}
