'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
      className={`fixed left-4 right-4 top-4 z-50 mx-auto max-w-7xl rounded-sm border transition-all duration-300 ${
        scrolled
          ? 'border-white/10 bg-stone-950/90 backdrop-blur-md'
          : 'border-white/[0.06] bg-stone-950/70 backdrop-blur-sm'
      }`}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-3 md:px-8 md:py-4">
        <Logo variant="nav" />

        <div className="flex items-center gap-3 md:gap-5">
          <Link
            href="/"
            className="hidden cursor-pointer text-sm text-stone-400 transition-colors hover:text-white sm:inline"
          >
            Voltar ao site
          </Link>

          <div className="hidden h-5 w-px bg-white/10 sm:block" aria-hidden="true" />

          <div className="flex items-center gap-2.5">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-9 w-9 rounded-full border border-white/10 object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-ember/30 bg-ember/15 font-display text-base text-ember">
                {initial}
              </div>
            )}
            <div className="hidden min-w-0 md:block">
              <p className="truncate text-sm text-white">{displayName}</p>
              <p className="truncate text-xs text-stone-500">{email}</p>
            </div>
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="cursor-pointer rounded-sm border border-white/15 px-3 py-2 text-xs uppercase tracking-wider text-stone-400 transition hover:border-white/25 hover:text-white"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
