'use client';

import { usePathname } from 'next/navigation';
import { DASHBOARD_NAV } from '@/lib/dashboard/constants';
import DashboardHeader from './DashboardHeader';
import DashboardNav from './DashboardNav';
import DashboardPageIntro from './DashboardPageIntro';

interface Props {
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  children: React.ReactNode;
}

export default function DashboardShell({
  displayName,
  email,
  avatarUrl,
  children,
}: Props) {
  const pathname = usePathname();
  const navItem =
    DASHBOARD_NAV.find((item) =>
      item.href === '/dashboard'
        ? pathname === '/dashboard'
        : pathname.startsWith(item.href)
    ) ?? DASHBOARD_NAV[0];

  const isOverview = pathname === '/dashboard';
  const title = isOverview ? (
    <>
      Olá, <span className="text-gradient-ember">{displayName.split(' ')[0]}</span>
    </>
  ) : (
    navItem.label
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-stone-950 bg-grid noise">
      <div
        className="pointer-events-none absolute -right-24 top-32 h-72 w-72 rounded-full bg-ember/10 blur-[100px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -left-32 bottom-40 h-64 w-64 rounded-full bg-frost/8 blur-[90px]"
        aria-hidden="true"
      />

      <DashboardHeader
        displayName={displayName}
        email={email}
        avatarUrl={avatarUrl}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 md:pt-32">
        <DashboardPageIntro
          eyebrow={navItem.eyebrow}
          title={title}
          description={navItem.description}
        />

        <div className="mt-8 md:mt-10">
          <DashboardNav />
        </div>

        <main className="mt-10 md:mt-12">{children}</main>
      </div>
    </div>
  );
}
