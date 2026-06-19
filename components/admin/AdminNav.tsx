'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { ADMIN_NAV } from '@/lib/admin/constants';

export default function AdminNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const active = navRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [pathname]);

  return (
    <div className="relative -mx-4 sm:-mx-6">
      <nav
        ref={navRef}
        className="admin-nav-scroll flex snap-x snap-mandatory gap-1.5 overflow-x-auto scroll-px-4 border-y border-zinc-800/90 bg-zinc-950/80 px-4 py-2 sm:scroll-px-6 sm:px-6"
        aria-label="Seções do admin"
      >
        {ADMIN_NAV.map((item) => {
          const active =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              data-active={active ? 'true' : undefined}
              className={`inline-flex min-h-[40px] shrink-0 snap-start cursor-pointer items-center rounded border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console ${
                active
                  ? 'border-console/40 bg-console/15 text-console'
                  : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
