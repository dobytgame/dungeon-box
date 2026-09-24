'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { DashboardNavGroup } from '@/lib/dashboard/content';
import { isDashboardNavActive } from '@/lib/dashboard/constants';
import DashboardNavIcon from './DashboardNavIcon';

interface Props {
  groups: DashboardNavGroup[];
  mobileOpen: boolean;
  onNavigate: () => void;
}

function NavLinks({
  groups,
  pathname,
  onNavigate,
}: {
  groups: DashboardNavGroup[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <ul className="space-y-7">
      {groups.map((group) => (
        <li key={group.id}>
          <p className="home-v2-display px-3 text-[11px] tracking-[0.22em] text-mesa-jade">
            {group.label}
          </p>
          <ul className="mt-2 space-y-1">
            {group.items.map((item) => {
              const active = isDashboardNavActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={onNavigate}
                    className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-3 text-sm transition-colors duration-200 ${
                      active
                        ? 'bg-mesa-ember text-mesa-ink'
                        : 'text-mesa-parchment hover:bg-white/[0.06]'
                    }`}
                  >
                    <DashboardNavIcon name={item.icon} />
                    <span className={active ? 'font-semibold' : undefined}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardNav({ groups, mobileOpen, onNavigate }: Props) {
  const pathname = usePathname();

  return (
    <div>
      <aside className="hidden lg:block">
        <nav
          className="sticky top-24 max-h-[calc(100svh-7rem)] overflow-y-auto pb-8 pr-2"
          aria-label="Seções da minha conta"
        >
          <NavLinks groups={groups} pathname={pathname} />
        </nav>
      </aside>

      {mobileOpen ? (
        <div
          id="dashboard-mobile-nav"
          className="home-v2-overlay fixed inset-x-0 bottom-0 top-[4.25rem] z-[80] overflow-y-auto border-t border-white/10 bg-mesa-ink px-4 pb-10 pt-6 lg:hidden"
        >
          <nav aria-label="Seções da minha conta">
            <NavLinks groups={groups} pathname={pathname} onNavigate={onNavigate} />
          </nav>
        </div>
      ) : null}
    </div>
  );
}
