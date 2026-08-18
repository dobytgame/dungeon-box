'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useReducedMotion } from 'framer-motion';
import { GUILD_HERO_IMAGES } from '@/lib/guild-lp/constants';

const ROTATE_MS = 5500;

export default function GuildLpHeroBackdrop() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const showControls = !reduced && GUILD_HERO_IMAGES.length > 1;

  useEffect(() => {
    if (!showControls) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % GUILD_HERO_IMAGES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [showControls, index]);

  return (
    <>
      {GUILD_HERO_IMAGES.map((image, imageIndex) => {
        const isActive = reduced ? imageIndex === 0 : imageIndex === index;
        return (
          <Image
            key={image.src}
            src={image.src}
            alt={image.alt}
            fill
            priority={imageIndex === 0}
            quality={85}
            sizes="100vw"
            aria-hidden={!isActive}
            className={`object-cover transition-opacity duration-1000 motion-reduce:transition-none ${image.objectPosition} ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
          />
        );
      })}

      {showControls ? (
        <div
          className="absolute bottom-24 right-3 z-10 flex gap-0.5 sm:bottom-10 sm:right-8 sm:gap-1"
          role="tablist"
          aria-label="Fotos do hero"
        >
          {GUILD_HERO_IMAGES.map((image, imageIndex) => {
            const isActive = imageIndex === index;
            return (
              <button
                key={image.src}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Mostrar foto ${imageIndex + 1} de ${GUILD_HERO_IMAGES.length}`}
                onClick={() => setIndex(imageIndex)}
                className="flex h-11 w-11 cursor-pointer items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-relic-gold"
              >
                <span
                  className={`block h-2.5 rounded-full transition-[width,background-color] duration-200 ${
                    isActive
                      ? 'w-7 bg-relic-gold'
                      : 'w-2.5 bg-white/35 hover:bg-white/60'
                  }`}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
