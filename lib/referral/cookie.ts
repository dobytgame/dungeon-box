export const REFERRAL_COOKIE_NAME = 'db_ref';
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const REFERRAL_VISIT_COUNTED_COOKIE_NAME = 'db_ref_counted';

export function normalizeReferralCode(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const normalized = raw.trim().toUpperCase();
  if (!/^DB-[A-Z0-9]{6}$/.test(normalized)) return null;
  return normalized;
}

export function buildReferralLink(code: string, origin?: string): string {
  const base = origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dungeonbox.com.br';
  return `${base.replace(/\/$/, '')}/?ref=${encodeURIComponent(code)}`;
}
