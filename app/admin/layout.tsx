import type { Metadata } from 'next';
import AdminShell from '@/components/admin/AdminShell';
import { requireAdmin } from '@/lib/admin/auth';
import { privatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = privatePageMetadata('Admin');

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await requireAdmin();
  const displayName =
    profile.display_name ??
    profile.full_name ??
    user.email?.split('@')[0] ??
    'Admin';

  return (
    <AdminShell
      displayName={displayName}
      email={profile.email ?? user.email ?? ''}
    >
      {children}
    </AdminShell>
  );
}
