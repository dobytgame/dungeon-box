'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import CTAButton from '@/components/ui/CTAButton';
import MobileNavPanel, { MobileNavToggle } from '@/components/layout/MobileNav';
import { siteNavLinkClassName } from '@/lib/ui/site-nav';

interface NavbarProps {
  isLoggedIn?: boolean;
  userName?: string | null;
}

export default function Navbar({ isLoggedIn = false, userName }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
        className={`fixed inset-x-0 top-0 px-3 pt-3 transition-[z-index] duration-200 sm:px-4 sm:pt-4 ${
          menuOpen ? 'z-[52]' : 'z-[var(--z-site-header)]'
        }`}
      >
        <div
          className={`mx-auto max-w-7xl rounded-sm border transition-all duration-300 ${
            scrolled || menuOpen
              ? 'border-white/10 bg-stone-950/90 backdrop-blur-md'
              : 'border-transparent bg-transparent'
          }`}
        >
          <nav
            className="flex min-w-0 items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-5 sm:py-3 md:px-8 md:py-4"
            aria-label="Navegação principal"
          >
            <div className="min-w-0 shrink">
              <Logo variant="nav" />
            </div>

          <div className="hidden items-center gap-8 md:flex">
            <Link
              href="#planos"
              className={`cursor-pointer text-stone-300 transition-colors hover:text-white ${siteNavLinkClassName}`}
            >
              Planos
            </Link>
            <Link
              href="#fidelidade"
              className={`cursor-pointer text-stone-300 transition-colors hover:text-white ${siteNavLinkClassName}`}
            >
              Fidelidade
            </Link>
            <Link
              href="#temas"
              className={`cursor-pointer text-stone-300 transition-colors hover:text-white ${siteNavLinkClassName}`}
            >
              Temas
            </Link>
            <Link
              href="#faq"
              className={`cursor-pointer text-stone-300 transition-colors hover:text-white ${siteNavLinkClassName}`}
            >
              FAQ
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="hidden text-sm text-stone-300 transition-colors hover:text-white sm:inline"
              >
                {userName ? `Olá, ${userName.split(' ')[0]}` : 'Minha conta'}
              </Link>
            ) : (
              <Link
                href="/auth"
                className="hidden text-sm text-stone-400 transition-colors hover:text-white sm:inline"
              >
                Entrar
              </Link>
            )}
            <CTAButton
              label={isLoggedIn ? 'Conta' : 'Assinar'}
              size="sm"
              href={isLoggedIn ? '/dashboard' : '/checkout?plan=heroi'}
              trackingLocation="navbar"
              className="hidden sm:inline-flex"
            />
            <MobileNavToggle open={menuOpen} onOpenChange={setMenuOpen} />
          </div>
        </nav>
        </div>
      </header>

      <MobileNavPanel
        open={menuOpen}
        onOpenChange={setMenuOpen}
        isLoggedIn={isLoggedIn}
        userName={userName}
      />
    </>
  );
}
