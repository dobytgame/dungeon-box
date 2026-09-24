'use client';

import { useEffect, useLayoutEffect } from 'react';

const TARGETS = '.home-v2-reveal:not([data-inview]), .home-v2-fog:not([data-inview])';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Marks reveal targets with `data-inview` once they enter the viewport.
 * Targets already on screen at hydration get `static` so they never flash.
 */
export default function HomeV2Motion() {
  useIsomorphicLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>('.home-v2');
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const mark = (node: Element, state: 'play' | 'static') => {
      node.setAttribute('data-inview', state);
      if (node.matches('.home-v2-snap')) {
        node.querySelectorAll(TARGETS).forEach((child) => child.setAttribute('data-inview', state));
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          mark(entry.target, 'play');
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );

    // Cards in a horizontal carousel are clipped sideways, so the carousel is observed instead.
    const targetFor = (node: HTMLElement): HTMLElement => {
      const carousel = node.closest<HTMLElement>('.home-v2-snap');
      return carousel && carousel.scrollWidth > carousel.clientWidth ? carousel : node;
    };

    const track = (initial: boolean) => {
      const viewportHeight = window.innerHeight;
      root.querySelectorAll<HTMLElement>(TARGETS).forEach((node) => {
        const target = targetFor(node);
        const rect = target.getBoundingClientRect();
        if (initial && rect.height > 0 && rect.top < viewportHeight && rect.bottom > 0) {
          mark(target, 'static');
          node.setAttribute('data-inview', 'static');
        } else {
          observer.observe(target);
        }
      });
    };

    track(true);
    root.classList.add('home-v2-motion');

    const mutations = new MutationObserver(() => track(false));
    mutations.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      root.classList.remove('home-v2-motion');
    };
  }, []);

  return null;
}
