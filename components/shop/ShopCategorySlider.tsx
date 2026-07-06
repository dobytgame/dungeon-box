'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ShopCategoryMediaCard from '@/components/shop/ShopCategoryMediaCard';
import type { StoreCategory } from '@/lib/store/load-catalog';

interface Props {
  categories: StoreCategory[];
}

const AUTO_ADVANCE_MS = 6000;

export default function ShopCategorySlider({ categories }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const track = trackRef.current;
    if (!track) return;
    setCanScrollLeft(track.scrollLeft > 8);
    setCanScrollRight(track.scrollLeft + track.clientWidth < track.scrollWidth - 8);
  }

  function scrollByPage(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;
    const amount = Math.max(track.clientWidth * 0.85, 280);
    track.scrollBy({ left: direction * amount, behavior: 'smooth' });
  }

  useEffect(() => {
    updateScrollState();
    const track = trackRef.current;
    if (!track) return;

    track.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);

    return () => {
      track.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [categories.length]);

  useEffect(() => {
    if (categories.length <= 1) return;
    const track = trackRef.current;
    if (!track) return;

    const timer = window.setInterval(() => {
      const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
      if (atEnd) {
        track.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        scrollByPage(1);
      }
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [categories.length]);

  if (categories.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.25em] text-stone-500">
            Navegue por
          </p>
          <h2 className="mt-2 font-display text-2xl uppercase tracking-wide text-white sm:text-3xl">
            Categorias
          </h2>
        </div>

        {categories.length > 1 ? (
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              disabled={!canScrollLeft}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm border border-white/10 text-stone-400 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Categorias anteriores"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              disabled={!canScrollRight}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm border border-white/10 text-stone-400 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Próximas categorias"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : null}
      </div>

      <div className="relative -mx-4 sm:-mx-6">
        <div
          ref={trackRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-none sm:gap-5 sm:px-6"
        >
          {categories.map((category) => (
            <ShopCategoryMediaCard
              key={category.slug}
              category={category}
              className="w-[72vw] max-w-[280px] shrink-0 snap-start sm:w-[240px] md:w-[260px] lg:w-[280px]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
