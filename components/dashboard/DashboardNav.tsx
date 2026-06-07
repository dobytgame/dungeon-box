'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DASHBOARD_NAV } from '@/lib/dashboard/constants';

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav
      className="dashboard-nav-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
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
            className={`shrink-0 cursor-pointer rounded-sm px-4 py-2.5 font-display text-sm uppercase tracking-widest transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember ${
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
  );
}
