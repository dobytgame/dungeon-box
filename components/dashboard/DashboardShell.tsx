'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { DashboardNavItem } from '@/lib/dashboard/constants';
import { isDashboardNavActive } from '@/lib/dashboard/constants';
import { groupDashboardNav } from '@/lib/dashboard/content';
import CorreiosStrikeModal from './CorreiosStrikeModal';
import DashboardHeader from './DashboardHeader';
import DashboardNav from './DashboardNav';
import DashboardPageIntro from './DashboardPageIntro';
import ShellNavigationFrame from '@/components/navigation/ShellNavigationFrame';

interface Props {
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  navItems: DashboardNavItem[];
  showCorreiosStrikeNotice?: boolean;
  children: React.ReactNode;
}

export default function DashboardShell({
  displayName,
  email,
  avatarUrl,
  navItems,
  showCorreiosStrikeNotice = false,
  children,
}: Props) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const groups = groupDashboardNav(navItems);
  const navItem =
    navItems.find((item) => isDashboardNavActive(pathname, item.href)) ?? navItems[0];

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isOverview = pathname === '/dashboard';
  const firstName = displayName.split(' ')[0];
  const title = isOverview ? <>Olá, {firstName}</> : navItem.label;

  return (
    <ShellNavigationFrame scope="/dashboard" variant="dashboard">
      <div className="relative isolate min-h-screen overflow-hidden bg-mesa-ink">
        <div className="home-v2-grid home-v2-fog-load absolute inset-0 -z-10" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-20 top-24 h-72 w-72 rounded-full bg-mesa-ember/[0.09] blur-[120px]"
          aria-hidden="true"
        />

        <DashboardHeader
          displayName={displayName}
          email={email}
          avatarUrl={avatarUrl}
          currentLabel={navItem.label}
          menuOpen={menuOpen}
          onMenuToggle={toggleMenu}
        />

        <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28">
          <div className="lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:items-start lg:gap-10">
            <DashboardNav groups={groups} mobileOpen={menuOpen} onNavigate={closeMenu} />
            <div>
              <DashboardPageIntro
                eyebrow={navItem.eyebrow}
                title={title}
                description={navItem.description}
              />
              <main id="conteudo-principal" className="mt-8 md:mt-10">
                {children}
              </main>
            </div>
          </div>
        </div>
        <CorreiosStrikeModal enabled={showCorreiosStrikeNotice} />
      </div>
    </ShellNavigationFrame>
  );
}
