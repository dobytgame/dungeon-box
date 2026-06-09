'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import CTAButton from '@/components/ui/CTAButton';
import MobileNavPanel, { MobileNavToggle } from '@/components/layout/MobileNav';
import { WHATSAPP_GUILD_URL } from '@/lib/launch/constants';

const navLinks = [
  { href: '#planos', label: 'Planos' },
  { href: '#solucao', label: 'Como funciona' },
  { href: '#captura', label: 'Entrar na Guilda' },
  { href: '#faq', label: 'FAQ' },
] as const;

interface Props {
  isLoggedIn?: boolean;
  userName?: string | null;
}

export default function LaunchNavbar({ isLoggedIn = false, userName }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onScroll = () => setMenuOpen(false);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [menuOpen]);

  return (
    <>
      <header
        className={`fixed left-3 right-3 top-3 z-50 mx-auto max-w-7xl rounded-sm border transition-all duration-300 sm:left-4 sm:right-4 sm:top-4 ${
          scrolled || menuOpen
            ? 'border-white/10 bg-stone-950/90 backdrop-blur-md'
            : 'border-transparent bg-transparent'
        }`}
      >
        <nav
          className="flex items-center justify-between gap-3 px-4 py-2.5 sm:gap-4 sm:px-5 sm:py-3 md:px-8 md:py-4"
          aria-label="Navegação principal"
        >
          <Logo variant="nav" />

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="cursor-pointer text-sm text-stone-300 transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="hidden text-sm text-stone-300 transition-colors hover:text-white sm:inline"
              >
                {userName ? `Olá, ${userName.split(' ')[0]}` : 'Minha conta'}
              </Link>
            ) : null}
            <CTAButton
              label="Grupo WhatsApp"
              size="sm"
              href={WHATSAPP_GUILD_URL}
              external
              className="hidden sm:inline-flex"
            />
            <MobileNavToggle open={menuOpen} onOpenChange={setMenuOpen} />
          </div>
        </nav>
      </header>

      <MobileNavPanel
        open={menuOpen}
        onOpenChange={setMenuOpen}
        isLoggedIn={isLoggedIn}
        userName={userName}
        links={navLinks}
        ctaLabel="Entrar na Guilda"
        ctaHref={WHATSAPP_GUILD_URL}
        ctaExternal
        showAuthLink={isLoggedIn}
      />
    </>
  );
}
