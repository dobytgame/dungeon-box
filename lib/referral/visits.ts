import type { SupabaseClient } from '@supabase/supabase-js';
import { findReferrerByCode } from '@/lib/referral/codes';

export async function recordReferralLinkVisit(
  admin: SupabaseClient,
  rawCode: string,
  options?: { visitorUserId?: string | null }
): Promise<'recorded' | 'skipped'> {
  const referrer = await findReferrerByCode(admin, rawCode);
  if (!referrer) return 'skipped';

  if (options?.visitorUserId && options.visitorUserId === referrer.userId) {
    return 'skipped';
  }

  const { data, error } = await admin.rpc('increment_referral_link_visit', {
    p_code: referrer.code,
  });

  if (error) {
    console.error('[referral] visit increment failed:', error.message);
    return 'skipped';
  }

  return data ? 'recorded' : 'skipped';
}

export async function getReferralVisitCount(
  admin: SupabaseClient,
  userId: string
): Promise<number> {
  const { data } = await admin
    .from('referral_codes')
    .select('total_visits')
    .eq('user_id', userId)
    .maybeSingle();

  return data?.total_visits ?? 0;
}
