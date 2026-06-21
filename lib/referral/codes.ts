import type { SupabaseClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import { normalizeReferralCode } from '@/lib/referral/cookie';

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCodeSuffix(length = 6): string {
  const bytes = randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += CODE_CHARS[bytes[i]! % CODE_CHARS.length];
  }
  return result;
}

export async function getOrCreateReferralCode(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: existing } = await supabase
    .from('referral_codes')
    .select('code')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing?.code) return existing.code;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = `DB-${randomCodeSuffix()}`;
    const { error } = await supabase.from('referral_codes').insert({
      user_id: userId,
      code,
    });

    if (!error) return code;
    if (error.code !== '23505') {
      throw new Error('Não foi possível gerar o código de indicação.');
    }
  }

  throw new Error('Não foi possível gerar o código de indicação.');
}

export async function findReferrerByCode(
  supabase: SupabaseClient,
  rawCode: string
): Promise<{ userId: string; code: string } | null> {
  const code = normalizeReferralCode(rawCode);
  if (!code) return null;

  const { data } = await supabase
    .from('referral_codes')
    .select('user_id, code')
    .eq('code', code)
    .maybeSingle();

  if (!data) return null;
  return { userId: data.user_id, code: data.code };
}
