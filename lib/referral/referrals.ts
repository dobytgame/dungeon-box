import type { SupabaseClient } from '@supabase/supabase-js';
import { findReferrerByCode } from '@/lib/referral/codes';

export async function registerReferralAtCheckout(
  supabase: SupabaseClient,
  input: {
    referredUserId: string;
    subscriptionId: string;
    referralCode: string | null;
    usedPromoCode: boolean;
  }
): Promise<'created' | 'skipped'> {
  if (!input.referralCode || input.usedPromoCode) return 'skipped';

  const referrer = await findReferrerByCode(supabase, input.referralCode);
  if (!referrer) return 'skipped';
  if (referrer.userId === input.referredUserId) return 'skipped';

  const { data: existing } = await supabase
    .from('referrals')
    .select('id')
    .eq('referred_id', input.referredUserId)
    .maybeSingle();

  if (existing) return 'skipped';

  const { error: insertError } = await supabase.from('referrals').insert({
    referrer_id: referrer.userId,
    referred_id: input.referredUserId,
    referred_subscription_id: input.subscriptionId,
    status: 'pending',
  });

  if (insertError) {
    console.error('[referral] register failed:', insertError.message);
    return 'skipped';
  }

  const { data: codeRow } = await supabase
    .from('referral_codes')
    .select('total_referrals')
    .eq('user_id', referrer.userId)
    .maybeSingle();

  if (codeRow) {
    await supabase
      .from('referral_codes')
      .update({ total_referrals: (codeRow.total_referrals ?? 0) + 1 })
      .eq('user_id', referrer.userId);
  }

  return 'created';
}

export async function cancelReferralForSubscription(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<void> {
  const { data: referral } = await supabase
    .from('referrals')
    .select('id, status')
    .eq('referred_subscription_id', subscriptionId)
    .maybeSingle();

  if (!referral || referral.status !== 'pending') return;

  await supabase
    .from('referrals')
    .update({ status: 'cancelled' })
    .eq('id', referral.id);
}

export async function getReferralHistory(
  supabase: SupabaseClient,
  referrerId: string
) {
  const { data: referrals } = await supabase
    .from('referrals')
    .select(
      'id, status, created_at, qualified_at, points_credited, referred_id'
    )
    .eq('referrer_id', referrerId)
    .order('created_at', { ascending: false });

  if (!referrals?.length) return [];

  const referredIds = referrals.map((r) => r.referred_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, display_name, email')
    .in('id', referredIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name || p.full_name || p.email?.split('@')[0] || 'Indicado'])
  );

  const referralIds = referrals.filter((r) => r.points_credited).map((r) => r.id);
  const { data: credits } = referralIds.length
    ? await supabase
        .from('points_ledger')
        .select('referral_id, amount')
        .in('referral_id', referralIds)
        .eq('type', 'credit')
    : { data: [] };

  const pointsMap = new Map(
    (credits ?? []).map((c) => [c.referral_id, c.amount])
  );

  return referrals.map((r) => ({
    id: r.id,
    status: r.status,
    createdAt: r.created_at,
    qualifiedAt: r.qualified_at,
    referredName: profileMap.get(r.referred_id) ?? 'Indicado',
    pointsEarned: pointsMap.get(r.id) ?? null,
  }));
}
