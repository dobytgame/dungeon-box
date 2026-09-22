import { getSiteUrl } from '@/lib/email/config';

export const PUBLIC_SITE_ORIGIN = 'https://www.dungeonbox.com.br';

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

function requestHostname(request: { headers: Headers; nextUrl: URL }): string {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const hostHeader = request.headers.get('host')?.trim();
  const rawHost = forwardedHost || hostHeader || request.nextUrl.host;
  return rawHost.split(':')[0]?.toLowerCase() ?? '';
}

/** Destino do logout. O alias *.vercel.app não é o site público. */
export function resolveSignOutOrigin(request: { headers: Headers; nextUrl: URL }): string {
  const hostname = requestHostname(request);

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const proto =
      request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
      request.nextUrl.protocol.replace(':', '');
    const host =
      request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
      request.headers.get('host')?.trim() ||
      request.nextUrl.host;
    return `${proto}://${host}`;
  }

  if (hostname === 'www.dungeonbox.com.br' || hostname === 'dungeonbox.com.br') {
    return PUBLIC_SITE_ORIGIN;
  }

  if (hostname.endsWith('.vercel.app')) {
    return PUBLIC_SITE_ORIGIN;
  }

  return normalizeOrigin(request.nextUrl.origin) ?? PUBLIC_SITE_ORIGIN;
}
