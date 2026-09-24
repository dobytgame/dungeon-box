'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Link2 } from 'lucide-react';
import HomeV2Button from '@/components/home-v2/HomeV2Button';
import HomeV2MediaFrame from '@/components/home-v2/HomeV2MediaFrame';
import HomeV2SectionHeading from '@/components/home-v2/HomeV2SectionHeading';
import { STORE_ROUTES } from '@/lib/store/routes';
import { HOME_V2_COPY, type HomeV2StoreProduct } from '@/lib/home-v2/content';
import {
  trackHomeV2StoreProductClicked,
  trackHomeV2StoreSectionViewed,
} from '@/lib/home-v2/analytics';

interface Props {
  products: HomeV2StoreProduct[];
}

export default function HomeV2StoreShelf({ products }: Props) {
  const sectionRef = useRef<HTMLElement>(null);
  const { store } = HOME_V2_COPY;

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.5) {
          trackHomeV2StoreSectionViewed();
          observer.disconnect();
        }
      },
      { threshold: [0.5] }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (products.length === 0) return null;

  return (
    <section
      id="loja"
      ref={sectionRef}
      className="bg-mesa-stone px-4 py-20 sm:px-6 md:py-28"
      aria-labelledby="home-v2-loja-title"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <HomeV2SectionHeading
            eyebrow={store.eyebrow}
            title={store.title}
            titleId="home-v2-loja-title"
            support={store.text}
          />
          <div className="home-v2-reveal hidden shrink-0 md:block">
            <HomeV2Button href={STORE_ROUTES.home} variant="outline" arrow>
              {store.exploreCta}
            </HomeV2Button>
          </div>
        </div>

        <ul className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {products.map((product, index) => (
            <li
              key={product.sku}
              className="home-v2-reveal"
              style={{ '--stagger': index * 0.6 } as React.CSSProperties}
            >
              <Link
                href={product.productUrl}
                onClick={() => trackHomeV2StoreProductClicked(product.sku, index + 1)}
                className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/10 bg-mesa-ink transition-[border-color,box-shadow] duration-200 hover:border-white/25 hover:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.8)]"
              >
                <div className="relative">
                  {product.image ? (
                    <HomeV2MediaFrame
                      src={product.image.src}
                      alt={product.image.alt}
                      sizes="(min-width: 1024px) 22vw, 50vw"
                      ratioClassName="aspect-square"
                    />
                  ) : (
                    <div className="home-v2-grid aspect-square bg-mesa-stone" aria-hidden="true" />
                  )}
                  <span
                    aria-hidden="true"
                    className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-mesa-ink/70 text-mesa-parchment opacity-0 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
                  >
                    <ArrowUpRight className="size-4" />
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-3.5 sm:p-4">
                  {product.category ? (
                    <p className="text-[11px] uppercase tracking-[0.16em] text-mesa-ash">
                      {product.category}
                    </p>
                  ) : null}
                  <h3 className="mt-1 line-clamp-3 text-[15px] leading-snug text-mesa-parchment sm:text-base" title={product.name}>
                    {product.name}
                  </h3>
                  {product.compatibleWithSubscription ? (
                    <p className="mt-2 inline-flex items-start gap-1 text-[11px] font-medium uppercase leading-tight tracking-[0.1em] text-mesa-jade">
                      <Link2 aria-hidden="true" className="mt-px size-3 shrink-0" />
                      {store.compatibleBadge}
                    </p>
                  ) : null}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                    <p className="font-semibold tabular-nums text-mesa-parchment">
                      {product.priceLabel}
                    </p>
                    <span className="home-v2-display hidden text-[11px] tracking-[0.14em] text-mesa-ash transition-colors group-hover:text-mesa-parchment sm:inline">
                      {store.productCta}
                    </span>
                    <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-mesa-ash sm:hidden" />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8 md:hidden">
          <HomeV2Button href={STORE_ROUTES.home} variant="outline" arrow className="w-full">
            {store.exploreCta}
          </HomeV2Button>
        </div>
      </div>
    </section>
  );
}
