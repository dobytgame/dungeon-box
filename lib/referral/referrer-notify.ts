import type { SupabaseClient } from '@supabase/supabase-js';
import {
  sendReferralConvertedEmail,
  sendReferralPointsEarnedEmail,
} from '@/lib/email/send-transactional';
import {
  calculateReferralPoints,
  countMonthlyQualifiedReferrals,
  getPointsBalance,
} from '@/lib/referral/points';
import { getReferralRank } from '@/lib/referral/ranks';

export async function notifyReferrerOnReferralConverted(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<void> {
  const { data: referral } = await supabase
    .from('referrals')
    .select('id, referrer_id, referred_id, status')
    .eq('referred_subscription_id', subscriptionId)
    .eq('status', 'pending')
    .maybeSingle();

  if (!referral) return;

  const [{ data: referrer }, { data: referred }] = await Promise.all([
    supabase
      .from('profiles')
      .select('email, full_name, display_name')
      .eq('id', referral.referrer_id)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('full_name, display_name, email')
      .eq('id', referral.referred_id)
      .maybeSingle(),
  ]);

  if (!referrer?.email) return;

  const referredName =
    referred?.display_name ||
    referred?.full_name ||
    referred?.email?.split('@')[0] ||
    'Um mestre';

  const monthlyQualified = await countMonthlyQualifiedReferrals(
    supabase,
    referral.referrer_id
  );
  const projectedPoints = calculateReferralPoints(monthlyQualified);

  const result = await sendReferralConvertedEmail({
    to: referrer.email,
    name: referrer.display_name || referrer.full_name,
    referredName,
    projectedPoints: projectedPoints || 100,
  });

  if (!result.sent) {
    console.warn('[email] referral converted not sent:', {
      subscriptionId,
      to: referrer.email,
      reason: result.reason,
    });
  }
}

export async function notifyReferrerOnPointsEarned(
  supabase: SupabaseClient,
  input: {
    referrerId: string;
    referredId: string;
    pointsEarned: number;
  }
): Promise<void> {
  const [{ data: referrer }, { data: referred }, balance, { data: codeRow }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('email, full_name, display_name')
        .eq('id', input.referrerId)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('full_name, display_name, email')
        .eq('id', input.referredId)
        .maybeSingle(),
      getPointsBalance(supabase, input.referrerId),
      supabase
        .from('referral_codes')
        .select('total_conversions')
        .eq('user_id', input.referrerId)
        .maybeSingle(),
    ]);

  if (!referrer?.email) return;

  const referredName =
    referred?.display_name ||
    referred?.full_name ||
    referred?.email?.split('@')[0] ||
    'Indicado';

  const rankName = getReferralRank(codeRow?.total_conversions ?? 0).name;

  const result = await sendReferralPointsEarnedEmail({
    to: referrer.email,
    name: referrer.display_name || referrer.full_name,
    referredName,
    pointsEarned: input.pointsEarned,
    newBalance: balance,
    rankName,
  });

  if (!result.sent) {
    console.warn('[email] referral points earned not sent:', {
      referrerId: input.referrerId,
      to: referrer.email,
      reason: result.reason,
    });
  }
}
