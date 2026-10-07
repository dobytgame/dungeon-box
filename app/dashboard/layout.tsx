import type { Metadata } from 'next';
import HomeV2Motion from '@/components/home-v2/HomeV2Motion';
import DashboardShell from '@/components/dashboard/DashboardShell';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { buildDashboardNav } from '@/lib/dashboard/constants';
import { userHasActiveReferralAccess } from '@/lib/referral/access';
import { isStoreLinkVisible } from '@/lib/store/access';
import { userHasActiveSubscriptionAccess } from '@/lib/subscriptions/active-access';
import { userCanSeeThemeVote } from '@/lib/theme-votes/access';
import {
  displayName,
  getProfile,
  requireDashboardUser,
} from '@/lib/dashboard/queries';
import '@/app/home-v2/home-v2.css';
import './dashboard.css';

export const metadata: Metadata = privatePageMetadata('Minha conta');

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
  const showCorreiosStrikeNotice = await userHasActiveSubscriptionAccess(
    supabase,
    user.id
  );
  const navItems = buildDashboardNav(showReferral, showStore, showThemeVote);

  return (
    <div className="home-v2 font-body">
      <a
        href="#conteudo-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[80] focus:bg-mesa-ember focus:px-4 focus:py-3 focus:font-homeBody focus:text-sm focus:font-semibold focus:text-mesa-ink"
      >
        Pular para o conteúdo
      </a>
      <HomeV2Motion />
      <DashboardShell
        displayName={name}
        email={profile?.email ?? user.email ?? ''}
        avatarUrl={profile?.avatar_url}
        navItems={navItems}
        showCorreiosStrikeNotice={showCorreiosStrikeNotice}
      >
        {children}
      </DashboardShell>
    </div>
  );
}
