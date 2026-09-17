import { createHmac, timingSafeEqual } from 'crypto';
import { getSiteUrl } from '@/lib/email/config';
import { STORE_ROUTES } from '@/lib/store/routes';

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 14;

function customOrderSecret(): string {
  const dedicated = process.env.STORE_CUSTOM_ORDER_SECRET?.trim();
  if (dedicated) return dedicated;
  const unsubscribe = process.env.EMAIL_UNSUBSCRIBE_SECRET?.trim();
  if (unsubscribe) return `custom-order:${unsubscribe}`;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (service) return `custom-order:${service}`;
  throw new Error('STORE_CUSTOM_ORDER_SECRET não configurado.');
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(payload: string): string {
  return createHmac('sha256', customOrderSecret())
    .update(payload)
    .digest('base64url');
}

export function createCustomStoreOrderPayToken(
  orderId: string,
  now = Date.now()
): string {
  const exp = Math.floor(now / 1000) + TOKEN_TTL_SECONDS;
  const payload = `${orderId.trim()}:${exp}`;
  return `${base64UrlEncode(payload)}.${sign(payload)}`;
}

export function verifyCustomStoreOrderPayToken(
  token: string
): { orderId: string } | { error: string } {
  try {
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) {
      return { error: 'Link de pagamento inválido.' };
    }

    let payload: string;
    try {
      payload = base64UrlDecode(encodedPayload);
    } catch {
      return { error: 'Link de pagamento inválido.' };
    }

    const expected = sign(payload);
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      return { error: 'Link de pagamento inválido.' };
    }

    const separator = payload.lastIndexOf(':');
    const orderId = payload.slice(0, separator).trim();
    const exp = Number(payload.slice(separator + 1));
    if (!orderId || !Number.isFinite(exp)) {
      return { error: 'Link de pagamento inválido.' };
    }
    if (exp * 1000 < Date.now()) {
      return { error: 'Este link de pagamento expirou. Peça um novo link.' };
    }

    return { orderId };
  } catch (error) {
    console.error('[store] custom order token:', error);
    return { error: 'Link de pagamento inválido.' };
  }
}

export function buildCustomStoreOrderPayUrl(orderId: string): string {
  const token = createCustomStoreOrderPayToken(orderId);
  return `${getSiteUrl()}${STORE_ROUTES.customPay(token)}`;
}
