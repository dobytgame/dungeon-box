'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_SALES_NAV, isAdminSalesNavActive } from '@/lib/admin/sales-nav';

export default function AdminSalesNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Vendas">
      {ADMIN_SALES_NAV.map((item) => {
        const active = isAdminSalesNavActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex min-h-[40px] cursor-pointer items-center rounded border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console ${
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
  );
}
