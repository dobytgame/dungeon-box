import DashboardShell from '@/components/dashboard/DashboardShell';
import {
  displayName,
  getProfile,
  requireDashboardUser,
} from '@/lib/dashboard/queries';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireDashboardUser();
  const profile = await getProfile(user.id);
  const name = displayName(profile, user.email);

  return (
    <DashboardShell
      displayName={name}
      email={profile?.email ?? user.email ?? ''}
      avatarUrl={profile?.avatar_url}
    >
      {children}
    </DashboardShell>
  );
}
