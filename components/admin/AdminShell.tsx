'use client';

import { usePathname } from 'next/navigation';
import { ADMIN_NAV } from '@/lib/admin/constants';
import AdminHeader from './AdminHeader';
import AdminNav from './AdminNav';
import AdminMarketingNav from './AdminMarketingNav';
import AdminFinanceNav from './AdminFinanceNav';
import AdminPageIntro from './AdminPageIntro';
import AdminSidebar from './AdminSidebar';
import AdminStoreNav from './AdminStoreNav';
import ShellNavigationFrame from '@/components/navigation/ShellNavigationFrame';
import { isAdminFinanceSection } from '@/lib/admin/finance-nav';
import { isAdminMarketingSection } from '@/lib/admin/marketing-nav';
import { isAdminStoreSection } from '@/lib/admin/store-nav';

interface Props {
  displayName: string;
  email: string;
  whatsappLeadsCount?: number;
  children: React.ReactNode;
}

function resolveAdminNavItem(pathname: string) {
  for (const item of ADMIN_NAV) {
    if ('children' in item && item.children) {
      for (const child of item.children) {
        if (child.href === '/admin/financeiro') {
          if (pathname === '/admin/financeiro') return item;
          continue;
        }
        if (pathname === child.href || pathname.startsWith(`${child.href}/`)) {
          return item;
        }
      }
    }
  }

  return (
    ADMIN_NAV.find((item) =>
      item.href === '/admin'
        ? pathname === '/admin'
        : pathname.startsWith(item.href)
    ) ?? ADMIN_NAV[0]
  );
}

export default function AdminShell({
  displayName,
  email,
  whatsappLeadsCount = 0,
  children,
}: Props) {
  const pathname = usePathname();
  const navItem = resolveAdminNavItem(pathname);

  const isOverview = pathname === '/admin';
  const title = isOverview ? 'Visão operacional' : navItem.label;

  return (
    <ShellNavigationFrame scope="/admin" variant="admin">
      <div className="admin-dot-grid flex min-h-screen bg-zinc-950 text-zinc-100">
        <AdminSidebar whatsappLeadsCount={whatsappLeadsCount} />

        <div className="flex min-w-0 flex-1 flex-col">
          <AdminHeader displayName={displayName} email={email} sectionLabel={navItem.label} />

          <main className="flex-1 px-4 pb-16 pt-4 sm:px-6 lg:px-8 lg:pt-6">
            <AdminPageIntro
              eyebrow={navItem.eyebrow}
              title={title}
              description={navItem.description}
            />

            <div className="mt-6 lg:hidden">
              <AdminNav />
            </div>

            {isAdminStoreSection(pathname) ? (
              <div className="mt-6">
                <AdminStoreNav />
              </div>
            ) : null}

            {isAdminFinanceSection(pathname) ? (
              <div className="mt-6">
                <AdminFinanceNav />
              </div>
            ) : null}

            {isAdminMarketingSection(pathname) ? (
              <div className="mt-6">
                <AdminMarketingNav leadsCount={whatsappLeadsCount} />
              </div>
            ) : null}

            <div className="mt-8 lg:mt-10">{children}</div>
          </main>
        </div>
      </div>
    </ShellNavigationFrame>
  );
}
