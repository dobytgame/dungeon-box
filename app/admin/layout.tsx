import type { Metadata } from 'next';
import AdminShell from '@/components/admin/AdminShell';
import { requireAdmin } from '@/lib/admin/auth';
import { countWhatsAppLeads } from '@/lib/admin/whatsapp-leads';
import { privatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = privatePageMetadata('Admin');

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, admin } = await requireAdmin();
  const displayName =
    profile.display_name ??
    profile.full_name ??
    user.email?.split('@')[0] ??
    'Admin';
  const whatsappLeadsCount = await countWhatsAppLeads(admin);

  return (
    <AdminShell
      displayName={displayName}
      email={profile.email ?? user.email ?? ''}
      whatsappLeadsCount={whatsappLeadsCount}
    >
      {children}
    </AdminShell>
  );
}
