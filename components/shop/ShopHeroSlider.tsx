'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { StoreBanner } from '@/lib/store/banners';

interface Props {
  banners: StoreBanner[];
}

export default function ShopHeroSlider({ banners }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % banners.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const banner = banners[index]!;

  return (
    <section className="relative overflow-hidden border-b border-white/[0.06]">
      <AnimatePresence mode="wait">
        <motion.div
          key={banner.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="relative min-h-[320px] sm:min-h-[400px] lg:min-h-[460px]"
        >
          {banner.imageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={banner.imageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div
                className="absolute inset-0 bg-gradient-to-r from-[#0A0C10] via-[#0A0C10]/80 to-transparent"
                aria-hidden="true"
              />
            </>
          ) : (
            <div
              className="absolute inset-0 bg-gradient-to-br from-stone-900 via-[#0A0C10] to-[#0A0C10]"
              aria-hidden="true"
            />
          )}
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(249,115,22,0.12),transparent_50%)]"
            aria-hidden="true"
          />

          <div className="relative mx-auto flex h-full max-w-7xl items-center px-4 py-16 sm:px-6 sm:py-20">
            <div className="max-w-2xl">
              <p className="font-display text-xs uppercase tracking-[0.35em] text-ember">
                Loja DungeonBox
              </p>
              <h1 className="mt-4 font-display text-4xl uppercase leading-tight tracking-wide text-white sm:text-5xl lg:text-6xl">
                {banner.title}
              </h1>
              {banner.subtitle ? (
                <p className="mt-6 max-w-xl text-base leading-relaxed text-stone-400 sm:text-lg">
                  {banner.subtitle}
                </p>
              ) : null}
              {banner.ctaLabel && banner.ctaHref ? (
                <Link
                  href={banner.ctaHref}
                  className="mt-8 inline-flex min-h-[44px] items-center rounded-sm bg-ember px-6 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
                >
                  {banner.ctaLabel}
                </Link>
              ) : null}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {banners.length > 1 ? (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
          {banners.map((entry, dotIndex) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setIndex(dotIndex)}
              className={`h-2 rounded-full transition-all ${
                dotIndex === index
                  ? 'w-8 bg-ember'
                  : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Ir para slide ${dotIndex + 1}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
