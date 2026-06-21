'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/dashboard/indique', label: 'Meu link' },
  { href: '/dashboard/indique/placar', label: 'Placar' },
] as const;

export default function ReferralSubNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex gap-2 border-b border-white/[0.06] pb-4"
      aria-label="Seções do Indique e Ganhe"
    >
      {ITEMS.map((item) => {
        const active =
          item.href === '/dashboard/indique'
            ? pathname === '/dashboard/indique'
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex min-h-[40px] items-center rounded-sm px-4 py-2 font-display text-xs uppercase tracking-widest transition-colors ${
              active
                ? 'bg-gold/15 text-gold'
                : 'text-stone-500 hover:bg-white/[0.04] hover:text-stone-300'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
