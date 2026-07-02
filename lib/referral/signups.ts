import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeReferralCode } from '@/lib/referral/cookie';
import { findReferrerByCode } from '@/lib/referral/codes';

export type ReferralSignupResult =
  | 'created'
  | 'skipped_invalid_code'
  | 'skipped_self'
  | 'skipped_existing';

/** Registra cadastro vindo de link ?ref= (cookie db_ref). */
export async function registerReferralAtSignup(
  admin: SupabaseClient,
  input: {
    referredUserId: string;
    referralCode: string | null;
  }
): Promise<ReferralSignupResult> {
  const code = normalizeReferralCode(input.referralCode);
  if (!code) return 'skipped_invalid_code';

  const referrer = await findReferrerByCode(admin, code);
  if (!referrer) return 'skipped_invalid_code';
  if (referrer.userId === input.referredUserId) return 'skipped_self';

  const { data: existing } = await admin
    .from('referral_signups')
    .select('id')
    .eq('referred_id', input.referredUserId)
    .maybeSingle();

  if (existing) return 'skipped_existing';

  const { error } = await admin.from('referral_signups').insert({
    referrer_id: referrer.userId,
    referred_id: input.referredUserId,
    referral_code: code,
  });

  if (error) {
    if (error.code === '23505') return 'skipped_existing';
    console.error('[referral] signup register failed:', error.message);
    return 'skipped_existing';
  }

  return 'created';
}

export async function countReferralSignups(admin: SupabaseClient): Promise<number> {
  const { count } = await admin
    .from('referral_signups')
    .select('id', { count: 'exact', head: true });

  return count ?? 0;
}

export async function loadReferralSignupByReferredIds(
  admin: SupabaseClient,
  referredIds: string[]
): Promise<
  Map<
    string,
    {
      referrerId: string;
      referralCode: string;
      createdAt: string | null;
    }
  >
> {
  const result = new Map<
    string,
    { referrerId: string; referralCode: string; createdAt: string | null }
  >();

  if (referredIds.length === 0) return result;

  const { data } = await admin
    .from('referral_signups')
    .select('referred_id, referrer_id, referral_code, created_at')
    .in('referred_id', referredIds);

  for (const row of data ?? []) {
    result.set(row.referred_id as string, {
      referrerId: row.referrer_id as string,
      referralCode: row.referral_code as string,
      createdAt: (row.created_at as string | null) ?? null,
    });
  }

  return result;
}
