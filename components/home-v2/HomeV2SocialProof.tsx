'use client';

import { useCallback, useState } from 'react';
import { ArrowRight, Camera, Quote } from 'lucide-react';
import HomeV2MediaFrame from '@/components/home-v2/HomeV2MediaFrame';
import HomeV2SectionHeading from '@/components/home-v2/HomeV2SectionHeading';
import HomeV2Stars from '@/components/home-v2/HomeV2Stars';
import HomeV2TestimonialViewer from '@/components/home-v2/HomeV2TestimonialViewer';
import { HOME_V2_COPY, type HomeV2Testimonial } from '@/lib/home-v2/content';
import { trackHomeV2TestimonialOpened } from '@/lib/home-v2/analytics';

interface Props {
  testimonials: HomeV2Testimonial[];
}

const VISIBLE_COUNT = 6;

export default function HomeV2SocialProof({ testimonials }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const closeViewer = useCallback(() => setOpenIndex(null), []);

  if (testimonials.length === 0) return null;

  const { social } = HOME_V2_COPY;
  const visible = testimonials.slice(0, VISIBLE_COUNT);
  const average =
    testimonials.reduce((sum, item) => sum + item.rating, 0) / testimonials.length;
  const averageLabel = average.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const open = (index: number, origin: 'card' | 'ver-todas') => {
    const item = testimonials[index];
    if (item) trackHomeV2TestimonialOpened(item.id, origin);
    setOpenIndex(index);
  };

  return (
    <section
      id="prova"
      className="overflow-hidden bg-mesa-ink px-4 py-20 sm:px-6 md:py-28"
      aria-labelledby="home-v2-prova-title"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <HomeV2SectionHeading
            eyebrow={social.eyebrow}
            title={social.title}
            titleId="home-v2-prova-title"
          />
          <div className="home-v2-reveal flex shrink-0 items-center gap-4 rounded-2xl border border-white/10 bg-mesa-stone/70 px-5 py-4">
            <p className="home-v2-display text-5xl leading-none text-mesa-parchment">{averageLabel}</p>
            <div>
              <HomeV2Stars value={average} size="md" />
              <p className="mt-1.5 text-xs text-mesa-ash">
                {testimonials.length} {social.ratingLabel}
              </p>
            </div>
          </div>
        </div>

        <ul className="home-v2-snap -mx-4 mt-12 flex scroll-px-4 gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3">
          {visible.map((item, index) => {
            const hasPhotos = item.imageUrls.length > 0;
            return (
              <li
                key={item.id}
                className="home-v2-reveal flex w-[82%] shrink-0 sm:w-auto"
                style={{ '--stagger': (index % 3) * 0.6 } as React.CSSProperties}
              >
                <article className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-mesa-stone transition-[border-color,box-shadow] duration-200 hover:border-white/25 hover:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.9)] has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-mesa-ember">
                  <div className="relative">
                    {hasPhotos ? (
                      <>
                        <HomeV2MediaFrame
                          src={item.imageUrls[0]}
                          alt={`Mesa de ${item.name}`}
                          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 80vw"
                          ratioClassName="aspect-[4/3]"
                        />
                        {item.imageUrls.length > 1 ? (
                          <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-mesa-ink/75 px-2.5 py-1 text-[11px] font-semibold text-mesa-parchment backdrop-blur-md">
                            <Camera aria-hidden="true" className="size-3.5" />
                            {item.imageUrls.length} fotos
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-mesa-ink">
                        <div className="home-v2-grid absolute inset-0" aria-hidden="true" />
                        <Quote aria-hidden="true" className="relative size-14 text-mesa-jade/25 transition-transform duration-300 group-hover:scale-110" strokeWidth={1.25} />
                        {item.context ? (
                          <span className="home-v2-display absolute bottom-3 left-4 text-[11px] tracking-[0.2em] text-mesa-ash">
                            {item.context}
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <HomeV2Stars value={item.rating} />
                    <blockquote className="mt-3 flex-1">
                      <p className="line-clamp-4 min-h-[5.5rem] text-sm leading-relaxed text-mesa-parchment">
                        “{item.quote}”
                      </p>
                    </blockquote>
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                      <p className="flex min-w-0 items-center gap-2.5 text-sm text-mesa-ash">
                        <span
                          aria-hidden="true"
                          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-mesa-jade/10 text-xs font-semibold text-mesa-jade"
                        >
                          {item.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate">
                          <span className="font-semibold text-mesa-parchment">{item.name}</span>
                          {item.context && hasPhotos ? ` · ${item.context}` : ''}
                        </span>
                      </p>
                      <button
                        type="button"
                        onClick={() => open(index, 'card')}
                        aria-label={`${social.readMore} de ${item.name}`}
                        className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-xs font-semibold text-mesa-jade outline-none transition-colors after:absolute after:inset-0 after:content-[''] hover:text-mesa-parchment"
                      >
                        Ler mais
                        <ArrowRight aria-hidden="true" className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>

        {testimonials.length > VISIBLE_COUNT ? (
        <div className="home-v2-reveal mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => open(0, 'ver-todas')}
            className="group/all home-v2-display inline-flex min-h-12 cursor-pointer items-center gap-2.5 rounded-sm border border-mesa-parchment/20 px-6 text-base tracking-[0.1em] text-mesa-parchment transition-colors duration-150 hover:border-mesa-jade/60 hover:bg-mesa-jade/[0.06]"
          >
            {social.viewAll}
            <span className="rounded-full bg-white/10 px-2 py-0.5 font-homeBody text-xs font-semibold normal-case tracking-normal">
              {testimonials.length}
            </span>
            <ArrowRight aria-hidden="true" className="size-4 transition-transform duration-150 group-hover/all:translate-x-[3px]" />
          </button>
        </div>
        ) : null}
      </div>

      {openIndex !== null ? (
        <HomeV2TestimonialViewer
          testimonials={testimonials}
          initialIndex={openIndex}
          onClose={closeViewer}
        />
      ) : null}
    </section>
  );
}
