'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LogOut } from 'lucide-react';
import Logo from '@/components/ui/Logo';

interface Props {
  displayName: string;
  email: string;
  avatarUrl?: string | null;
}

export default function DashboardHeader({ displayName, email, avatarUrl }: Props) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header
      className={`fixed left-3 right-3 top-3 z-50 mx-auto max-w-7xl rounded-sm border transition-all duration-300 sm:left-4 sm:right-4 sm:top-4 ${
        scrolled
          ? 'border-white/10 bg-stone-950/90 backdrop-blur-md'
          : 'border-white/[0.06] bg-stone-950/70 backdrop-blur-sm'
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:gap-4 sm:px-5 sm:py-3 md:px-8 md:py-4">
        <Logo variant="nav" />

        <div className="flex min-w-0 items-center gap-2 sm:gap-3 md:gap-5">
          <Link
            href="/"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-white/10 text-stone-400 transition-colors hover:border-white/20 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember sm:h-auto sm:w-auto sm:border-0 sm:p-0"
            aria-label="Voltar ao site"
          >
            <ArrowLeft className="h-4 w-4 sm:hidden" aria-hidden="true" />
            <span className="hidden text-sm sm:inline">Voltar ao site</span>
          </Link>

          <div className="hidden h-5 w-px bg-white/10 sm:block" aria-hidden="true" />

          <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full border border-white/10 object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ember/30 bg-ember/15 font-display text-base text-ember">
                {initial}
              </div>
            )}
            <div className="hidden min-w-0 md:block">
              <p className="truncate text-sm text-white">{displayName}</p>
              <p className="truncate text-xs text-stone-500">{email}</p>
            </div>
            <p className="max-w-[5.5rem] truncate text-xs text-stone-300 sm:max-w-[7rem] md:hidden">
              {displayName.split(' ')[0]}
            </p>
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-white/15 text-stone-400 transition hover:border-white/25 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember sm:h-auto sm:w-auto sm:px-3 sm:py-2"
              aria-label="Sair da conta"
            >
              <LogOut className="h-4 w-4 sm:hidden" aria-hidden="true" />
              <span className="hidden text-xs uppercase tracking-wider sm:inline">Sair</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
