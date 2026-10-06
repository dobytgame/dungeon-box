'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ShopSection from '@/components/shop/ShopSection';
import StoreProductFeatureCard from '@/components/store/StoreProductFeatureCard';
import type { StoreProduct } from '@/lib/store/catalog';

interface Props {
  title?: string;
  eyebrow?: string;
  products: StoreProduct[];
}

const AUTO_ADVANCE_MS = 6000;

type PageItem = {
  product: StoreProduct;
  key: string;
};

function buildPages(items: StoreProduct[], size: number): PageItem[][] {
  if (items.length === 0) return [];

  const pages: PageItem[][] = [];
  for (let i = 0; i < items.length; i += size) {
    pages.push(
      items.slice(i, i + size).map((product) => ({
        product,
        key: product.id,
      }))
    );
  }

  const lastPage = pages[pages.length - 1]!;
  if (lastPage.length < size) {
    let fillIndex = 0;
    while (lastPage.length < size) {
      const product = items[fillIndex % items.length]!;
      lastPage.push({
        product,
        key: `${product.id}-fill-${lastPage.length}`,
      });
      fillIndex++;
    }
  }

  return pages;
}

function useCardsPerPage() {
  const [cardsPerPage, setCardsPerPage] = useState(4);

  useEffect(() => {
    function update() {
      const width = window.innerWidth;
      if (width < 1024) setCardsPerPage(2);
      else setCardsPerPage(4);
    }

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return cardsPerPage;
}

export default function ShopProductSlider({ title, eyebrow, products }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const slideIndexRef = useRef(0);
  const isJumpingRef = useRef(false);
  const [pageIndex, setPageIndex] = useState(0);
  const cardsPerPage = useCardsPerPage();

  const basePages = useMemo(
    () => buildPages(products, cardsPerPage),
    [products, cardsPerPage]
  );

  const loopedPages = useMemo(() => {
    if (basePages.length <= 1) return basePages;
    return [...basePages, ...basePages, ...basePages];
  }, [basePages]);

  const totalBasePages = basePages.length;
  const loopOffset = totalBasePages > 1 ? totalBasePages : 0;

  const scrollToSlide = useCallback((index: number, smooth: boolean) => {
    const track = trackRef.current;
    if (!track) return;

    const slide = track.children[index] as HTMLElement | undefined;
    if (!slide) return;

    isJumpingRef.current = !smooth;
    track.scrollTo({
      left: slide.offsetLeft,
      behavior: smooth ? 'smooth' : 'auto',
    });

    slideIndexRef.current = index;
    if (totalBasePages > 0) {
      setPageIndex(((index - loopOffset) % totalBasePages + totalBasePages) % totalBasePages);
    }
  }, [loopOffset, totalBasePages]);

  const normalizeLoopPosition = useCallback(() => {
    if (totalBasePages <= 1) return;

    const track = trackRef.current;
    if (!track) return;

    const current = slideIndexRef.current;

    if (current < loopOffset) {
      const target = current + totalBasePages;
      scrollToSlide(target, false);
      return;
    }

    if (current >= loopOffset + totalBasePages) {
      const target = current - totalBasePages;
      scrollToSlide(target, false);
    }
  }, [loopOffset, scrollToSlide, totalBasePages]);

  const goToRelativePage = useCallback(
    (delta: number) => {
      if (totalBasePages <= 1) return;
      scrollToSlide(slideIndexRef.current + delta, true);
    },
    [scrollToSlide, totalBasePages]
  );

  const goToPage = useCallback(
    (index: number) => {
      if (totalBasePages <= 1) return;
      scrollToSlide(loopOffset + index, true);
    },
    [loopOffset, scrollToSlide, totalBasePages]
  );

  useEffect(() => {
    if (totalBasePages <= 1) {
      slideIndexRef.current = 0;
      setPageIndex(0);
      trackRef.current?.scrollTo({ left: 0, behavior: 'auto' });
      return;
    }

    scrollToSlide(loopOffset, false);
  }, [loopOffset, scrollToSlide, totalBasePages, cardsPerPage, products.length]);

  useEffect(() => {
    if (totalBasePages <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const timer = window.setInterval(() => {
      goToRelativePage(1);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [goToRelativePage, totalBasePages]);

  useEffect(() => {
    const trackEl = trackRef.current;
    if (!trackEl) return;

    let scrollEndTimer: number;

    function onScroll() {
      if (isJumpingRef.current) return;

      const el = trackRef.current;
      if (!el) return;

      const children = Array.from(el.children) as HTMLElement[];
      if (children.length === 0) return;

      const scrollLeft = el.scrollLeft;
      let closest = 0;
      let minDistance = Infinity;

      for (let i = 0; i < children.length; i++) {
        const distance = Math.abs(children[i]!.offsetLeft - scrollLeft);
        if (distance < minDistance) {
          minDistance = distance;
          closest = i;
        }
      }

      slideIndexRef.current = closest;
      if (totalBasePages > 0) {
        setPageIndex(
          ((closest - loopOffset) % totalBasePages + totalBasePages) % totalBasePages
        );
      }

      window.clearTimeout(scrollEndTimer);
      scrollEndTimer = window.setTimeout(() => {
        isJumpingRef.current = false;
        normalizeLoopPosition();
      }, 150);
    }

    trackEl.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      trackEl.removeEventListener('scroll', onScroll);
      window.clearTimeout(scrollEndTimer);
    };
  }, [loopOffset, normalizeLoopPosition, loopedPages.length, totalBasePages]);

  if (products.length === 0) return null;

  const showControls = totalBasePages > 1;
  const arrowClass =
    'flex size-11 cursor-pointer items-center justify-center rounded-sm border border-white/15 text-mesa-parchment transition-colors duration-200 hover:border-white/35 hover:bg-white/[0.04]';

  const controls = showControls ? (
    <div className="flex items-center gap-4">
      <div className="hidden gap-1.5 sm:flex" role="group" aria-label="Páginas">
        {basePages.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => goToPage(index)}
            aria-label={`Ir para página ${index + 1}`}
            aria-current={index === pageIndex ? 'true' : undefined}
            className="group flex h-11 cursor-pointer items-center"
          >
            <span
              className={`block h-0.5 rounded-full transition-all duration-300 ${
                index === pageIndex ? 'w-8 bg-mesa-ember' : 'w-4 bg-white/25 group-hover:bg-white/45'
              }`}
            />
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => goToRelativePage(-1)} className={arrowClass} aria-label="Produtos anteriores">
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => goToRelativePage(1)} className={arrowClass} aria-label="Próximos produtos">
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  ) : null;

  return (
    <ShopSection
      titleId={`loja-slider-${(title ?? 'destaques').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
      eyebrow={eyebrow}
      title={title ?? 'Destaques'}
      aside={controls}
    >
      <div
        ref={trackRef}
        className="home-v2-reveal flex snap-x snap-mandatory overflow-x-auto scrollbar-none"
        aria-roledescription="carrossel"
      >
        {loopedPages.map((pageProducts, pageKey) => (
          <div
            key={pageKey}
            className="grid w-full shrink-0 snap-start grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
          >
            {pageProducts.map((item) => (
              <StoreProductFeatureCard key={item.key} product={item.product} />
            ))}
          </div>
        ))}
      </div>
    </ShopSection>
  );
}
