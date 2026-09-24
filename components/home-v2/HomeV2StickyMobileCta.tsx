'use client';

import { useEffect, useRef, useState } from 'react';
import HomeV2Button from '@/components/home-v2/HomeV2Button';
import { HOME_V2_COPY } from '@/lib/home-v2/content';
import { trackHomeV2HeroCta } from '@/lib/home-v2/analytics';

const SUPPRESSING_SECTIONS = ['planos', 'comecar'];

export default function HomeV2StickyMobileCta() {
  const [pastHero, setPastHero] = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hero = document.getElementById('home-v2-hero-title');
    if (!hero) return;

    const heroObserver = new IntersectionObserver(
      ([entry]) => {
        setPastHero(!entry?.isIntersecting);
      },
      { threshold: 0.15 }
    );
    heroObserver.observe(hero);

    const visibleSections = new Set<string>();
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visibleSections.add(entry.target.id);
          else visibleSections.delete(entry.target.id);
        });
        setSuppressed(visibleSections.size > 0);
      },
      { rootMargin: '0px 0px -30% 0px' }
    );
    SUPPRESSING_SECTIONS.forEach((id) => {
      const node = document.getElementById(id);
      if (node) sectionObserver.observe(node);
    });

    return () => {
      heroObserver.disconnect();
      sectionObserver.disconnect();
    };
  }, []);

  const visible = pastHero && !suppressed;

  useEffect(() => {
    barRef.current?.toggleAttribute('inert', !visible);
  }, [visible]);

  return (
    <div
      ref={barRef}
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-mesa-ink/90 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl transition-[transform,opacity] duration-300 ease-out md:hidden ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
      }`}
      aria-hidden={!visible}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="home-v2-display text-[11px] tracking-[0.18em] text-mesa-ash">
            Assinatura mensal
          </p>
          <p className="truncate text-sm font-semibold text-mesa-parchment">
            {HOME_V2_COPY.startingPrice}
          </p>
        </div>
        <HomeV2Button
          href="#planos"
          arrow
          className="shrink-0"
          onClick={() => trackHomeV2HeroCta('sticky-mobile')}
        >
          Ver planos
        </HomeV2Button>
      </div>
    </div>
  );
}
