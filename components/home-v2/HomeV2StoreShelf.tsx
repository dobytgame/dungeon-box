'use client';

import { useEffect, useRef } from 'react';
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
      className="bg-mesa-stone px-4 py-16 sm:px-6 md:py-24"
      aria-labelledby="home-v2-loja-title"
    >
      <div className="mx-auto max-w-6xl">
        <HomeV2SectionHeading
          eyebrow={HOME_V2_COPY.store.eyebrow}
          title={HOME_V2_COPY.store.title}
          titleId="home-v2-loja-title"
          support={HOME_V2_COPY.store.text}
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product, index) => (
            <article
              key={product.sku}
              className="group overflow-hidden rounded-sm border border-white/10 bg-mesa-ink"
            >
              {product.image ? (
                <HomeV2MediaFrame
                  src={product.image.src}
                  alt={product.image.alt}
                  sizes="(min-width: 1024px) 22vw, 50vw"
                  ratioClassName="aspect-square"
                />
              ) : (
                <div className="aspect-square bg-mesa-stone" aria-hidden="true" />
              )}
              <div className="p-4">
                {product.category ? (
                  <p className="text-[11px] uppercase tracking-[0.16em] text-mesa-ash">
                    {product.category}
                  </p>
                ) : null}
                <h3 className="mt-1 text-base text-mesa-parchment">{product.name}</h3>
                {product.compatibleWithSubscription ? (
                  <p className="home-v2-display mt-2 text-[10px] tracking-[0.14em] text-mesa-jade">
                    {HOME_V2_COPY.store.compatibleBadge}
                  </p>
                ) : null}
                <p className="mt-3 font-semibold text-mesa-ember">
                  {product.priceLabel}
                </p>
                <HomeV2Button
                  href={product.productUrl}
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => trackHomeV2StoreProductClicked(product.sku, index + 1)}
                >
                  {HOME_V2_COPY.store.productCta}
                </HomeV2Button>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8">
          <HomeV2Button href={STORE_ROUTES.home} variant="outline">
            {HOME_V2_COPY.store.exploreCta}
          </HomeV2Button>
        </div>
      </div>
    </section>
  );
}
