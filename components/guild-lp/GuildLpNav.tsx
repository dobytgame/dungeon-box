'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import Logo from '@/components/ui/Logo';
import GuildLpCta from '@/components/guild-lp/GuildLpCta';
import { GUILD_WHATSAPP_URL } from '@/lib/guild-lp/constants';

const navLinks = [
  { href: '#prova', label: 'Mestres' },
  { href: '#produto', label: 'O kit' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#planos', label: 'Planos' },
  { href: '#faq', label: 'FAQ' },
] as const;

interface Props {
  isLoggedIn?: boolean;
  userName?: string | null;
}

export default function GuildLpNav({ isLoggedIn = false, userName }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 sm:pt-4">
      <div
        className={`mx-auto max-w-[1200px] rounded border transition-colors duration-200 ${
          scrolled || menuOpen
            ? 'border-white/10 bg-relic-ink/92 backdrop-blur-md'
            : 'border-transparent bg-transparent'
        }`}
      >
        <nav
          className="flex min-w-0 items-center justify-between gap-3 px-3 py-2 sm:px-5 sm:py-3"
          aria-label="Navegação da Guilda"
        >
          <div className="min-w-0 shrink">
            <Logo variant="nav" href="/" />
          </div>

          <div className="hidden items-center gap-7 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="cursor-pointer font-sora text-[15px] font-semibold text-relic-parchment/80 transition-colors duration-200 hover:text-relic-gold"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="hidden cursor-pointer font-sora text-sm text-relic-muted transition-colors hover:text-relic-parchment sm:inline"
              >
                {userName ? `Olá, ${userName.split(' ')[0]}` : 'Minha conta'}
              </Link>
            ) : null}
            <GuildLpCta
              href={GUILD_WHATSAPP_URL}
              className="hidden min-h-[44px] px-5 py-2.5 text-sm sm:inline-flex sm:min-h-[44px] sm:w-auto sm:px-5 sm:py-2.5 sm:text-sm"
            >
              Entrar na Guilda
            </GuildLpCta>
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded border border-white/15 text-relic-parchment transition-colors duration-200 hover:border-relic-gold/40 hover:text-relic-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-relic-gold lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="guild-mobile-nav"
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </nav>

        {menuOpen ? (
          <div
            id="guild-mobile-nav"
            className="border-t border-white/10 px-4 py-5 lg:hidden"
          >
            <ul className="space-y-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="flex min-h-11 cursor-pointer items-center font-sora text-base text-relic-parchment transition-colors hover:text-relic-gold"
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <GuildLpCta href={GUILD_WHATSAPP_URL} className="mt-5">
              Entrar na Guilda
            </GuildLpCta>
          </div>
        ) : null}
      </div>
    </header>
  );
}
