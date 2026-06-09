import { getSiteUrl } from '@/lib/email/config';

function normalizeOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Origem usada nos redirects do Supabase Auth.
 * Prioriza a origem da requisição (ex.: preview Vercel) quando válida.
 */
export function resolveAuthRedirectOrigin(requestOrigin?: string): string {
  const candidates = [
    requestOrigin,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : undefined,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const origin = normalizeOrigin(candidate.replace(/\/$/, ''));
    if (origin) return origin;
  }

  return normalizeOrigin(getSiteUrl()) ?? 'http://localhost:3000';
}
