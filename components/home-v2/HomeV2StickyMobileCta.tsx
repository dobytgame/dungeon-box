'use client';

import { useEffect, useState } from 'react';
import HomeV2Button from '@/components/home-v2/HomeV2Button';
import { HOME_V2_COPY } from '@/lib/home-v2/content';
import { trackHomeV2HeroCta } from '@/lib/home-v2/analytics';

export default function HomeV2StickyMobileCta() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById('home-v2-hero-title');
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry?.isIntersecting);
      },
      { threshold: 0.15 }
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-mesa-ink/94 p-3 backdrop-blur-md md:hidden">
      <HomeV2Button
        href="#planos"
        className="w-full"
        onClick={() => trackHomeV2HeroCta('sticky-mobile')}
      >
        {HOME_V2_COPY.headerCta}
      </HomeV2Button>
    </div>
  );
}
