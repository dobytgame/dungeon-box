'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Expand } from 'lucide-react';

export const PLAN_PHOTO_SIZES = '(min-width: 1024px) 30vw, (min-width: 640px) 36rem, 100vw';

interface Props {
  planName: string;
  photos: Array<{ src: string; alt: string }>;
  onOpen: (index: number) => void;
}

export default function HomeV2PlanGallery({ planName, photos, onOpen }: Props) {
  const scrollerRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const total = photos.length;

  const scrollToPhoto = (next: number) => {
    const node = scrollerRef.current;
    if (!node) return;
    const target = (next + total) % total;
    node.scrollTo({ left: target * node.clientWidth, behavior: 'smooth' });
  };

  const onScroll = () => {
    const node = scrollerRef.current;
    if (!node || node.clientWidth === 0) return;
    setIndex(Math.round(node.scrollLeft / node.clientWidth));
  };

  const arrowClass =
    'absolute top-1/2 hidden size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-mesa-ink/70 text-mesa-parchment opacity-0 backdrop-blur-md transition-[opacity,background-color] duration-200 hover:bg-mesa-ink focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mesa-ember group-hover/gallery:opacity-100 md:flex';

  return (
    <div className="group/gallery relative">
      <ul
        ref={scrollerRef}
        onScroll={onScroll}
        className="home-v2-snap flex aspect-[16/10] overflow-x-auto overscroll-x-contain bg-mesa-stone [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={`Fotos do kit ${planName}`}
      >
        {photos.map((photo, photoIndex) => (
          <li key={photo.src} className="relative w-full shrink-0">
            <button
              type="button"
              onClick={() => onOpen(photoIndex)}
              aria-label={`Ampliar foto ${photoIndex + 1} de ${total} do kit ${planName}`}
              className="absolute inset-0 cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-mesa-ember"
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes={PLAN_PHOTO_SIZES}
                className="object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-mesa-ink to-transparent"
        aria-hidden="true"
      />

      {total > 1 ? (
        <>
          <button
            type="button"
            onClick={() => scrollToPhoto(index - 1)}
            aria-label="Foto anterior"
            className={`${arrowClass} left-3`}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollToPhoto(index + 1)}
            aria-label="Próxima foto"
            className={`${arrowClass} right-3`}
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </button>

          <div className="pointer-events-none absolute bottom-3 right-4 flex gap-1.5" aria-hidden="true">
            {photos.map((photo, dotIndex) => (
              <span
                key={photo.src}
                className={`h-1 rounded-full transition-[width,background-color] duration-300 ${
                  dotIndex === index ? 'w-6 bg-mesa-parchment' : 'w-2 bg-mesa-parchment/35'
                }`}
              />
            ))}
          </div>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => onOpen(index)}
        className="home-v2-display absolute right-3 top-3 inline-flex min-h-9 cursor-pointer after:absolute after:-inset-1 after:content-[''] items-center gap-1.5 rounded-full bg-mesa-ink/70 px-3 text-xs tracking-[0.12em] text-mesa-parchment backdrop-blur-md transition-colors duration-200 hover:bg-mesa-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-mesa-ember"
      >
        <Expand aria-hidden="true" className="size-3.5" />
        Ver fotos
        <span className="tabular-nums text-mesa-ash">
          {index + 1}/{total}
        </span>
      </button>
    </div>
  );
}
