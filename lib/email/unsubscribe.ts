import { createHmac, timingSafeEqual } from 'crypto';
import { getSiteUrl } from '@/lib/email/config';

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 365; // 1 ano

function unsubscribeSecret(): string {
  const dedicated = process.env.EMAIL_UNSUBSCRIBE_SECRET?.trim();
  if (dedicated) return dedicated;
  const resend = process.env.RESEND_API_KEY?.trim();
  if (resend) return `unsub:${resend}`;
  throw new Error('EMAIL_UNSUBSCRIBE_SECRET ou RESEND_API_KEY não configurado.');
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(payload: string): string {
  return createHmac('sha256', unsubscribeSecret())
    .update(payload)
    .digest('base64url');
}

export function normalizeEmailAddress(email: string): string {
  return email.trim().toLowerCase();
}

/** Token assinado para descadastro (e-mail + expiração). */
export function createUnsubscribeToken(email: string, now = Date.now()): string {
  const normalized = normalizeEmailAddress(email);
  const exp = Math.floor(now / 1000) + TOKEN_TTL_SECONDS;
  const payload = `${normalized}:${exp}`;
  return `${base64UrlEncode(payload)}.${sign(payload)}`;
}

export function verifyUnsubscribeToken(
  token: string
): { email: string } | { error: string } {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return { error: 'Token inválido.' };
  }

  let payload: string;
  try {
    payload = base64UrlDecode(encodedPayload);
  } catch {
    return { error: 'Token inválido.' };
  }

  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return { error: 'Token inválido.' };
  }

  const [email, expRaw] = payload.split(':');
  const exp = Number(expRaw);
  if (!email || !Number.isFinite(exp)) {
    return { error: 'Token inválido.' };
  }
  if (exp * 1000 < Date.now()) {
    return { error: 'Link de descadastro expirado.' };
  }

  return { email: normalizeEmailAddress(email) };
}

export function buildUnsubscribeUrl(email: string): string {
  const token = createUnsubscribeToken(email);
  return `${getSiteUrl()}/email/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function buildUnsubscribeApiUrl(email: string): string {
  const token = createUnsubscribeToken(email);
  return `${getSiteUrl()}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function buildMarketingListUnsubscribeHeaders(email: string): Record<string, string> {
  const httpsUrl = buildUnsubscribeApiUrl(email);
  const mailto = 'mailto:privacidade@dungeonbox.com.br?subject=Descadastrar';
  return {
    'List-Unsubscribe': `<${mailto}>, <${httpsUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
