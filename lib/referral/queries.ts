import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { getOrCreateReferralCode } from '@/lib/referral/codes';
import { buildReferralLink } from '@/lib/referral/cookie';
import {
  getExpiringSoonPoints,
  getPointsBalance,
} from '@/lib/referral/points';
import { getReferralHistory } from '@/lib/referral/referrals';
import { getRedemptionHistory } from '@/lib/referral/redemptions';
import { userHasActiveReferralAccess } from '@/lib/referral/access';
import { getReferralVisitCount } from '@/lib/referral/visits';

export async function getReferralDashboardData(
  supabase: SupabaseClient,
  userId: string
) {
  const hasAccess = await userHasActiveReferralAccess(supabase, userId);
  if (!hasAccess) {
    return { hasAccess: false as const };
  }

  const admin = createAdminClient();
  const code = await getOrCreateReferralCode(admin, userId);
  const [balance, expiringSoon, referrals, redemptions, totalVisits] =
    await Promise.all([
    getPointsBalance(admin, userId),
    getExpiringSoonPoints(admin, userId),
    getReferralHistory(admin, userId),
    getRedemptionHistory(admin, userId),
    getReferralVisitCount(admin, userId),
  ]);

  return {
    hasAccess: true as const,
    code,
    link: buildReferralLink(code),
    balance,
    expiringSoon,
    totalVisits,
    referrals,
    redemptions,
  };
}
