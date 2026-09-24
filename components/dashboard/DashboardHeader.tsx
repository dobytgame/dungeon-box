'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LogOut, Menu, X } from 'lucide-react';
import Logo from '@/components/ui/Logo';

interface Props {
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  currentLabel: string;
  menuOpen: boolean;
  onMenuToggle: () => void;
}

export default function DashboardHeader({
  displayName,
  email,
  avatarUrl,
  currentLabel,
  menuOpen,
  onMenuToggle,
}: Props) {
  const [scrolled, setScrolled] = useState(false);

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
      if (event.key === 'Escape') onMenuToggle();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen, onMenuToggle]);

  const initial = displayName.charAt(0).toUpperCase();
  const solid = scrolled || menuOpen;

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`border-b transition-[background-color,border-color,backdrop-filter] duration-300 ${
          solid
            ? 'border-white/10 bg-mesa-ink/85 backdrop-blur-xl backdrop-saturate-150'
            : 'border-transparent bg-mesa-ink/40 backdrop-blur-sm'
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Logo variant="nav" href="/dashboard" className="h-12 sm:h-14" />
            <div className="hidden min-w-0 sm:block">
              <p className="home-v2-display text-[11px] tracking-[0.22em] text-mesa-jade">
                Minha conta
              </p>
              <p className="truncate text-sm text-mesa-ash lg:hidden">{currentLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-white/10 text-mesa-ash transition-colors duration-200 hover:border-white/30 hover:text-mesa-parchment sm:h-11 sm:w-auto sm:gap-2 sm:px-3"
              aria-label="Voltar ao site"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              <span className="hidden text-sm sm:inline">Site</span>
            </Link>

            <div className="flex min-w-0 items-center gap-2">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt=""
                  className="size-9 shrink-0 rounded-full border border-white/10 object-cover"
                />
              ) : (
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-mesa-ember/35 bg-mesa-ember/15 home-v2-display text-sm text-mesa-ember">
                  {initial}
                </div>
              )}
              <div className="hidden min-w-0 md:block">
                <p className="truncate text-sm text-mesa-parchment">{displayName}</p>
                <p className="truncate text-xs text-mesa-ash">{email}</p>
              </div>
            </div>

            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-white/10 text-mesa-ash transition-colors duration-200 hover:border-white/30 hover:text-mesa-parchment sm:h-11 sm:w-auto sm:px-3"
                aria-label="Sair da conta"
              >
                <LogOut className="size-4 sm:hidden" aria-hidden="true" />
                <span className="hidden home-v2-display text-[11px] tracking-[0.14em] sm:inline">
                  Sair
                </span>
              </button>
            </form>

            <button
              type="button"
              className="flex size-11 cursor-pointer items-center justify-center rounded-sm border border-white/10 bg-mesa-ink/40 text-mesa-parchment transition-colors duration-200 hover:border-white/30 lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="dashboard-mobile-nav"
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu da conta'}
              onClick={onMenuToggle}
            >
              {menuOpen ? (
                <X className="size-5" aria-hidden="true" />
              ) : (
                <Menu className="size-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
