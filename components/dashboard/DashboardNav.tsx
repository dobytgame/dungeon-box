'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { DASHBOARD_NAV } from '@/lib/dashboard/constants';

export default function DashboardNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const active = navRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [pathname]);

  return (
    <div className="dashboard-nav-fade relative -mx-4 sm:-mx-6">
      <nav
        ref={navRef}
        className="dashboard-nav-scroll flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-px-4 px-4 pb-1 sm:scroll-px-6 sm:px-6"
        aria-label="Seções da minha conta"
      >
        {DASHBOARD_NAV.map((item) => {
          const active =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              data-active={active ? 'true' : undefined}
              className={`inline-flex min-h-[44px] shrink-0 snap-start cursor-pointer items-center rounded-sm px-4 py-2.5 font-display text-sm uppercase tracking-widest transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${
                active
                  ? 'bg-ember text-stone-950'
                  : 'border border-white/10 text-stone-400 hover:border-white/20 hover:text-white'
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
