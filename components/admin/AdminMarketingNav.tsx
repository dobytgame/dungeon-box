'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ADMIN_MARKETING_NAV,
  isAdminMarketingNavActive,
} from '@/lib/admin/marketing-nav';

interface Props {
  leadsCount: number;
}

function formatCount(count: number): string {
  if (count > 999) return '999+';
  return String(count);
}

export default function AdminMarketingNav({ leadsCount }: Props) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Marketing">
      {ADMIN_MARKETING_NAV.map((item) => {
        const active = isAdminMarketingNavActive(pathname, item.href);
        const showBadge = 'showCount' in item && item.showCount;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console ${
              active
                ? 'border-console/40 bg-console/15 text-console'
                : 'border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
            }`}
          >
            <span>{item.label}</span>
            {showBadge ? (
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] tracking-normal ${
                  active
                    ? 'bg-console/25 text-console'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {formatCount(leadsCount)}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
