'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
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
  Star,
  Terminal,
  Ticket,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ADMIN_NAV, ADMIN_NAV_GROUPS } from '@/lib/admin/constants';
import { isAdminFinanceNavActive, isAdminFinanceSection } from '@/lib/admin/finance-nav';
import { isAdminMarketingNavActive } from '@/lib/admin/marketing-nav';
import { isAdminSalesNavActive, isAdminSalesSection } from '@/lib/admin/sales-nav';
import { isAdminStoreNavActive, isAdminStoreSection } from '@/lib/admin/store-nav';
import { isAdminThemesNavActive } from '@/lib/admin/themes-nav';

const ICONS: Record<(typeof ADMIN_NAV)[number]['icon'], LucideIcon> = {
  bell: Bell,
  'layout-dashboard': LayoutDashboard,
  mail: Mail,
  handshake: Handshake,
  users: Users,
  repeat: Repeat,
  package: Package,
  receipt: Receipt,
  landmark: Landmark,
  layers: Layers,
  'shopping-bag': ShoppingBag,
  palette: Palette,
  'qr-code': QrCode,
  ticket: Ticket,
  star: Star,
  'scroll-text': ScrollText,
};

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  if (href === '/admin/financeiro') return isAdminFinanceSection(pathname);
  if (href === '/admin/vendas') return isAdminSalesSection(pathname);
  if (href === '/admin/loja') return isAdminStoreSection(pathname);
  return pathname.startsWith(href);
}

function isChildActive(
  pathname: string,
  parentHref: string,
  childHref: string
): boolean {
  if (parentHref === '/admin/marketing') {
    return isAdminMarketingNavActive(pathname, childHref);
  }
  if (parentHref === '/admin/financeiro') {
    return isAdminFinanceNavActive(pathname, childHref);
  }
  if (parentHref === '/admin/vendas') {
    return isAdminSalesNavActive(pathname, childHref);
  }
  if (parentHref === '/admin/loja') {
    return isAdminStoreNavActive(pathname, childHref);
  }
  if (parentHref === '/admin/temas') {
    return isAdminThemesNavActive(pathname, childHref);
  }
  return pathname === childHref || pathname.startsWith(`${childHref}/`);
}

function formatNavCount(count: number): string {
  if (count > 999) return '999+';
  return String(count);
}

interface Props {
  whatsappLeadsCount?: number;
}

export default function AdminSidebar({ whatsappLeadsCount = 0 }: Props) {
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
                            const childActive = isChildActive(
                              pathname,
                              item.href,
                              child.href
                            );
                            const showCount =
                              'showCount' in child && child.showCount === true;

                            return (
                              <li key={child.href}>
                                <Link
                                  href={child.href}
                                  aria-current={childActive ? 'page' : undefined}
                                  className={`flex items-center justify-between gap-2 rounded px-2 py-1.5 text-xs transition-colors ${
                                    childActive
                                      ? 'text-console'
                                      : 'text-zinc-500 hover:text-zinc-200'
                                  }`}
                                >
                                  <span>{child.label}</span>
                                  {showCount ? (
                                    <span
                                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] tracking-normal ${
                                        childActive
                                          ? 'bg-console/20 text-console'
                                          : 'bg-zinc-800 text-zinc-400'
                                      }`}
                                    >
                                      {formatNavCount(whatsappLeadsCount)}
                                    </span>
                                  ) : null}
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
