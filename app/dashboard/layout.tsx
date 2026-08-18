import type { Metadata } from 'next';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { buildDashboardNav } from '@/lib/dashboard/constants';
import { userHasActiveReferralAccess } from '@/lib/referral/access';
import { isStoreLinkVisible } from '@/lib/store/access';
import { userCanSeeThemeVote } from '@/lib/theme-votes/access';

export const metadata: Metadata = privatePageMetadata('Minha conta');
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
  const { user, supabase } = await requireDashboardUser();
  const profile = await getProfile(user.id);
  const name = displayName(profile, user.email);
  const showReferral = await userHasActiveReferralAccess(supabase, user.id);
  const showStore = isStoreLinkVisible();
  const showThemeVote = userCanSeeThemeVote(profile?.is_admin === true);
  const navItems = buildDashboardNav(showReferral, showStore, showThemeVote);

  return (
    <DashboardShell
      displayName={name}
      email={profile?.email ?? user.email ?? ''}
      avatarUrl={profile?.avatar_url}
      navItems={navItems}
    >
      {children}
    </DashboardShell>
  );
}
