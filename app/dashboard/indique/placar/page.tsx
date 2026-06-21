import { redirect } from 'next/navigation';
import ReferralScoreboard from '@/components/referral/ReferralScoreboard';
import ReferralSubNav from '@/components/referral/ReferralSubNav';
import { requireDashboardUser } from '@/lib/dashboard/queries';
import { userHasActiveReferralAccess } from '@/lib/referral/access';
import { getReferralScoreboard } from '@/lib/referral/scoreboard';
import { createAdminClient } from '@/lib/supabase/admin';
import { privatePageMetadata } from '@/lib/seo/metadata';

export const metadata = privatePageMetadata('Placar — Indique e Ganhe');

export default async function ReferralScoreboardPage() {
  const { user, supabase } = await requireDashboardUser();
  const hasAccess = await userHasActiveReferralAccess(supabase, user.id);

  if (!hasAccess) {
    redirect('/dashboard/subscription?referral=inactive');
  }

  const admin = createAdminClient();
  const stats = await getReferralScoreboard(admin, user.id);

  return (
    <div className="space-y-8 md:space-y-10">
      <ReferralSubNav />
      <ReferralScoreboard stats={stats} />
    </div>
  );
}
