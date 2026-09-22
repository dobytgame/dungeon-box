'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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

export default function HomeV2Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`border-b transition-colors duration-200 ${
          scrolled || menuOpen
            ? 'border-white/10 bg-mesa-ink/90 backdrop-blur-md'
            : 'border-transparent bg-transparent'
        }`}
      >
        <nav
          className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6"
          aria-label="Navegação principal"
        >
          <Logo variant="nav" href="/home-v2" className="h-12 sm:h-14" />

          <div className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="cursor-pointer text-sm font-medium text-mesa-ash transition-colors hover:text-mesa-parchment"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <HomeV2Button
              href="#planos"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => trackHomeV2HeroCta('header')}
            >
              {HOME_V2_COPY.headerCta}
            </HomeV2Button>
            <button
              type="button"
              className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-sm border border-white/10 text-mesa-parchment md:hidden"
              aria-expanded={menuOpen}
              aria-controls="home-v2-mobile-nav"
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="sr-only">{menuOpen ? 'Fechar' : 'Menu'}</span>
              <span aria-hidden="true" className="text-lg leading-none">
                {menuOpen ? '×' : '☰'}
              </span>
            </button>
          </div>
        </nav>
      </div>

      {menuOpen ? (
        <div
          id="home-v2-mobile-nav"
          className="border-b border-white/10 bg-mesa-ink/96 px-4 py-4 backdrop-blur-md md:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-sm px-2 py-3 text-base text-mesa-parchment"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Link
              href="#planos"
              className="home-v2-display mt-2 rounded-sm bg-mesa-ember px-4 py-3 text-center text-xs tracking-[0.16em] text-mesa-ink"
              onClick={() => {
                trackHomeV2HeroCta('header-mobile');
                setMenuOpen(false);
              }}
            >
              {HOME_V2_COPY.headerCta}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
