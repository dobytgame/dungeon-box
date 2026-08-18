'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Expand } from 'lucide-react';
import GuildLpMark from '@/components/guild-lp/GuildLpMark';
import ImageLightbox from '@/components/ui/ImageLightbox';
import { GUILD_PRODUCT_SHOTS } from '@/lib/guild-lp/constants';
import { guildLpCopy } from '@/lib/guild-lp/copy';

const lightboxImages = GUILD_PRODUCT_SHOTS.map((shot) => shot.src);

export default function GuildLpProduct() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <section
      id="produto"
      className="scroll-mt-24 bg-relic-ink px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      aria-labelledby="produto-title"
    >
      <div className="mx-auto max-w-[1200px]">
        <p className="flex items-center gap-2 font-cinzel text-[11px] font-semibold uppercase tracking-[0.28em] text-relic-gold">
          <GuildLpMark className="h-2.5 w-2.5" />
          {guildLpCopy.productEyebrow}
        </p>
        <h2
          id="produto-title"
          className="mt-4 font-cinzel text-[clamp(1.75rem,4vw,2.75rem)] font-bold uppercase leading-[0.95] tracking-wide text-relic-parchment"
        >
          {guildLpCopy.productHeadline}
        </h2>
        <p className="mt-3 max-w-xl text-base leading-[1.7] text-relic-muted sm:text-lg">
          {guildLpCopy.productSub}
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-5">
          {GUILD_PRODUCT_SHOTS.map((shot, index) => (
            <button
              key={shot.src}
              type="button"
              onClick={() => setLightboxIndex(index)}
              className="guild-frame group relative cursor-pointer overflow-hidden rounded-lg border border-white/[0.08] bg-relic-surface text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-relic-gold"
              aria-label={`Ampliar foto: ${shot.alt}`}
            >
              <span
                className="guild-frame-br pointer-events-none absolute bottom-3 right-3 z-[2] h-[18px] w-[18px] border-b-[1.5px] border-r-[1.5px] border-relic-gold/70"
                aria-hidden="true"
              />
              <span
                className="guild-frame-bl pointer-events-none absolute bottom-3 left-3 z-[2] h-[18px] w-[18px] border-b-[1.5px] border-l-[1.5px] border-relic-gold/70"
                aria-hidden="true"
              />
              <span className="relative block aspect-[4/3]">
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  fill
                  quality={80}
                  loading={index === 0 ? 'eager' : 'lazy'}
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover object-top transition-opacity duration-200 group-hover:opacity-90"
                />
                <span
                  className="absolute right-3 top-3 z-[2] flex h-11 w-11 items-center justify-center rounded border border-white/15 bg-relic-ink/70 text-relic-parchment backdrop-blur-sm transition-colors duration-200 group-hover:border-relic-gold/50 group-hover:text-relic-gold"
                  aria-hidden="true"
                >
                  <Expand className="h-4 w-4" />
                </span>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-relic-ink via-relic-ink/85 to-transparent px-5 pb-5 pt-16 text-sm leading-relaxed text-relic-parchment">
                  {shot.caption}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex ?? 0}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        altPrefix="Foto do kit DungeonBox"
      />
    </section>
  );
}
