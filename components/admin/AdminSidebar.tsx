'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Handshake,
  Landmark,
  Layers,
  LayoutDashboard,
  Mail,
  Package,
  Palette,
  QrCode,
  Receipt,
  Repeat,
  ScrollText,
  ShoppingBag,
  Terminal,
  Ticket,
  Users,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ADMIN_NAV, ADMIN_NAV_GROUPS } from '@/lib/admin/constants';
import { isAdminStoreNavActive } from '@/lib/admin/store-nav';

const ICONS: Record<(typeof ADMIN_NAV)[number]['icon'], LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  mail: Mail,
  handshake: Handshake,
  users: Users,
  repeat: Repeat,
  package: Package,
  receipt: Receipt,
  landmark: Landmark,
  wallet: Wallet,
  layers: Layers,
  'shopping-bag': ShoppingBag,
  palette: Palette,
  'qr-code': QrCode,
  ticket: Ticket,
  'scroll-text': ScrollText,
};

function isActive(pathname: string, href: string) {
  return href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
}

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-800/90 bg-zinc-950 lg:flex">
      <div className="flex h-14 items-center gap-2.5 border-b border-zinc-800/90 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded border border-console/30 bg-console/10">
          <Terminal className="h-4 w-4 text-console" aria-hidden="true" />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-300">
            Dungeonbox
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-console">
            Console ops
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Administração">
        {ADMIN_NAV_GROUPS.map((group) => {
          const items = ADMIN_NAV.filter((item) => item.group === group.id);

          return (
            <div key={group.id} className="mb-6 last:mb-0">
              <p className="mb-2 px-2 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-600">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = ICONS[item.icon];
                  const children =
                    'children' in item && item.children ? item.children : null;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={`flex items-center gap-2.5 rounded px-2.5 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-console ${
                          active
                            ? 'border border-console/25 bg-console/10 text-console'
                            : 'border border-transparent text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-100'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                      </Link>

                      {children ? (
                        <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-zinc-800/80 pl-2">
                          {children.map((child) => {
                            const childActive = isAdminStoreNavActive(
                              pathname,
                              child.href
                            );

                            return (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  aria-current={childActive ? 'page' : undefined}
                                  className={`block rounded px-2 py-1.5 text-xs transition-colors ${
                                    childActive
                                      ? 'text-console'
                                      : 'text-zinc-500 hover:text-zinc-200'
                                  }`}
                                >
                                  {child.label}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800/90 p-3">
        <Link
          href="/dashboard"
          className="block rounded border border-zinc-800 px-2.5 py-2 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300"
        >
          Modo cliente →
        </Link>
      </div>
    </aside>
  );
}
