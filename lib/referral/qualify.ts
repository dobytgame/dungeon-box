import type { SupabaseClient } from '@supabase/supabase-js';
import { userHasActiveReferralAccess } from '@/lib/referral/access';
import {
  calculateReferralPoints,
  countMonthlyQualifiedReferrals,
  creditReferralPoints,
} from '@/lib/referral/points';
import { REFERRAL_QUALIFICATION_DAYS } from '@/lib/referral/constants';
import { notifyReferrerOnPointsEarned } from '@/lib/referral/referrer-notify';

function daysSince(dateIso: string): number {
  const start = new Date(dateIso).getTime();
  const now = Date.now();
  return Math.floor((now - start) / (1000 * 60 * 60 * 24));
}

export async function qualifyPendingReferrals(
  supabase: SupabaseClient
): Promise<{ qualified: number; cancelled: number }> {
  const { data: pending } = await supabase
    .from('referrals')
    .select(
      'id, referrer_id, referred_id, referred_subscription_id, created_at, status'
    )
    .eq('status', 'pending');

  if (!pending?.length) return { qualified: 0, cancelled: 0 };

  let qualified = 0;
  let cancelled = 0;

  for (const referral of pending) {
    if (!referral.referred_subscription_id) {
      await supabase
        .from('referrals')
        .update({ status: 'cancelled' })
        .eq('id', referral.id);
      cancelled += 1;
      continue;
    }

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('status, started_at, created_at')
      .eq('id', referral.referred_subscription_id)
      .maybeSingle();

    if (!subscription || subscription.status !== 'active') {
      if (
        subscription &&
        ['cancelled', 'expired'].includes(subscription.status)
      ) {
        await supabase
          .from('referrals')
          .update({ status: 'cancelled' })
          .eq('id', referral.id);
        cancelled += 1;
      }
      continue;
    }

    const activeSince =
      subscription.started_at ?? subscription.created_at ?? referral.created_at;
    if (daysSince(activeSince) < REFERRAL_QUALIFICATION_DAYS) {
      continue;
    }

    const referrerActive = await userHasActiveReferralAccess(
      supabase,
      referral.referrer_id
    );
    if (!referrerActive) {
      continue;
    }

    const monthlyCount = await countMonthlyQualifiedReferrals(
      supabase,
      referral.referrer_id
    );
    const points = calculateReferralPoints(monthlyCount);
    if (points <= 0) {
      await supabase
        .from('referrals')
        .update({ status: 'expired' })
        .eq('id', referral.id);
      cancelled += 1;
      continue;
    }

    const { data: referredProfile } = await supabase
      .from('profiles')
      .select('full_name, display_name, email')
      .eq('id', referral.referred_id)
      .maybeSingle();

    const referredName =
      referredProfile?.display_name ||
      referredProfile?.full_name ||
      referredProfile?.email?.split('@')[0] ||
      'Indicado';

    const now = new Date().toISOString();

    await creditReferralPoints(supabase, {
      userId: referral.referrer_id,
      referralId: referral.id,
      amount: points,
      description: `Indicação ${referredName}`,
    });

    await supabase
      .from('referrals')
      .update({
        status: 'qualified',
        qualified_at: now,
        points_credited: true,
      })
      .eq('id', referral.id);

    const { data: codeRow } = await supabase
      .from('referral_codes')
      .select('total_conversions')
      .eq('user_id', referral.referrer_id)
      .maybeSingle();

    if (codeRow) {
      await supabase
        .from('referral_codes')
        .update({
          total_conversions: (codeRow.total_conversions ?? 0) + 1,
        })
        .eq('user_id', referral.referrer_id);
    }

    void notifyReferrerOnPointsEarned(supabase, {
      referrerId: referral.referrer_id,
      referredId: referral.referred_id,
      pointsEarned: points,
    }).catch((err) => {
      console.error('[email] referral points earned notify failed:', err);
    });

    qualified += 1;
  }

  return { qualified, cancelled };
}
