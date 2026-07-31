'use client';

import Link from 'next/link';
import { ArrowLeft, LogOut } from 'lucide-react';
import AdminNotificationsBell from './AdminNotificationsBell';

interface Props {
  displayName: string;
  email: string;
  sectionLabel: string;
}

export default function AdminHeader({ displayName, email, sectionLabel }: Props) {
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/90 bg-zinc-950/95 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex items-center gap-2 lg:hidden">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Ops
            </span>
            <span className="text-zinc-700" aria-hidden="true">
              /
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate font-mono text-sm text-zinc-200">{sectionLabel}</p>
            <p className="hidden truncate font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600 sm:block">
              Console administrativo
            </p>
          </div>
          <span className="hidden items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-400/90">
              Online
            </span>
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500 transition hover:text-zinc-300 md:inline-flex"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Site
          </Link>

          <Link
            href="/dashboard"
            className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500 transition hover:text-zinc-300 lg:inline"
          >
            Cliente
          </Link>

          <div className="hidden h-4 w-px bg-zinc-800 sm:block" aria-hidden="true" />

          <AdminNotificationsBell />

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-zinc-700 bg-zinc-900 font-mono text-xs text-console">
              {initial}
            </div>
            <div className="hidden min-w-0 md:block">
              <p className="truncate text-sm text-zinc-200">{displayName}</p>
              <p className="truncate font-mono text-[10px] text-zinc-600">{email}</p>
            </div>
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded border border-zinc-800 text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console sm:h-auto sm:w-auto sm:px-3 sm:py-1.5"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4 sm:hidden" aria-hidden="true" />
              <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] sm:inline">
                Sair
              </span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
