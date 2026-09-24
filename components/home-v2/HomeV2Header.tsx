'use client';

import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import HomeV2Button from '@/components/home-v2/HomeV2Button';
import { HOME_V2_COPY } from '@/lib/home-v2/content';
import { trackHomeV2HeroCta } from '@/lib/home-v2/analytics';

const NAV_LINKS = [
  { href: '#jornada', label: 'Como funciona' },
  { href: '#planos', label: 'Planos' },
  { href: '#loja', label: 'Loja' },
  { href: '#faq', label: 'FAQ' },
] as const;

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null);
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: [0, 0.25, 0.5] }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

const SECTION_IDS = NAV_LINKS.map((link) => link.href.slice(1));

export default function HomeV2Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const active = useActiveSection(SECTION_IDS);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const solid = scrolled || menuOpen;

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`relative border-b transition-[background-color,border-color,backdrop-filter] duration-300 ${
          solid
            ? 'border-white/10 bg-mesa-ink/85 backdrop-blur-xl backdrop-saturate-150'
            : 'border-transparent bg-transparent'
        }`}
      >
        <nav
          className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6"
          aria-label="Navegação principal"
        >
          <Logo variant="nav" href="/home-v2" className="h-12 sm:h-14" />

          <ul className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => {
              const current = active === link.href.slice(1);
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={current ? 'location' : undefined}
                    className={`block cursor-pointer rounded-sm px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                      current ? 'text-mesa-parchment' : 'text-mesa-ash hover:text-mesa-parchment'
                    }`}
                  >
                    {link.label}
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-2">
            <HomeV2Button
              href="#planos"
              size="sm"
              arrow
              className="hidden sm:inline-flex"
              onClick={() => trackHomeV2HeroCta('header')}
            >
              {HOME_V2_COPY.headerCta}
            </HomeV2Button>
            <button
              type="button"
              className="flex size-11 cursor-pointer items-center justify-center rounded-sm border border-white/10 bg-mesa-ink/40 text-mesa-parchment backdrop-blur-sm transition-colors hover:border-white/30 md:hidden"
              aria-expanded={menuOpen}
              aria-controls="home-v2-mobile-nav"
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <X aria-hidden="true" className="size-5" />
              ) : (
                <Menu aria-hidden="true" className="size-5" />
              )}
            </button>
          </div>
        </nav>
      </div>

      {menuOpen ? (
        <div
          id="home-v2-mobile-nav"
          className="home-v2-overlay h-[calc(100svh-4.25rem)] overflow-y-auto border-b border-white/10 bg-mesa-ink px-4 pb-8 pt-4 md:hidden"
        >
          <ul className="flex flex-col">
            {NAV_LINKS.map((link, index) => (
              <li
                key={link.href}
                className="home-v2-enter border-b border-white/[0.07]"
                style={{ '--enter-step': index * 0.6 } as React.CSSProperties}
              >
                <a
                  href={link.href}
                  className="block rounded-sm px-2 py-3 text-base text-mesa-parchment"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="home-v2-enter mt-8" style={{ '--enter-step': 2.4 } as React.CSSProperties}>
            <HomeV2Button
              href="#planos"
              size="lg"
              arrow
              className="w-full"
              onClick={() => {
                trackHomeV2HeroCta('header-mobile');
                setMenuOpen(false);
              }}
            >
              {HOME_V2_COPY.headerCta}
            </HomeV2Button>
          </div>
          <p className="mt-3 text-center text-sm text-mesa-ash">{HOME_V2_COPY.startingPrice}</p>
        </div>
      ) : null}
    </header>
  );
}
