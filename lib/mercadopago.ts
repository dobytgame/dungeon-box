import MercadoPagoConfig, { Payment, PreApproval } from 'mercadopago';

export const MP_CONFIGURED = Boolean(process.env.MP_ACCESS_TOKEN);

export function assertMpConfigured() {
  if (!MP_CONFIGURED) {
    throw new Error('Mercado Pago não configurado (MP_ACCESS_TOKEN).');
  }
}

let mpConfig: MercadoPagoConfig | null = null;

export function getMpConfig(): MercadoPagoConfig {
  assertMpConfigured();
  if (!mpConfig) {
    mpConfig = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN!,
      options: { timeout: 10000 },
    });
  }
  return mpConfig;
}

export function getPreApprovalClient() {
  return new PreApproval(getMpConfig());
}

export function getPaymentClient() {
  return new Payment(getMpConfig());
}

export type MpPreapprovalStatus = 'authorized' | 'paused' | 'cancelled' | 'pending';

export async function updateMpPreapprovalStatus(
  mpSubscriptionId: string,
  status: MpPreapprovalStatus
) {
  const client = getPreApprovalClient();
  return client.update({
    id: mpSubscriptionId,
    body: { status },
  });
}

export function mpAppUrl(path = '') {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000';
  return `${base.replace(/\/$/, '')}${path}`;
}

function tryMpPublicOrigin(raw?: string): string | null {
  if (!raw?.trim()) return null;

  try {
    const withProtocol = raw.includes('://') ? raw : `https://${raw}`;
    const url = new URL(withProtocol);

    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      return null;
    }

    url.protocol = 'https:';
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * HTTPS URL for Mercado Pago redirects (back_url). MP rejects localhost.
 */
export function mpBackUrl(path = '/checkout/success'): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  const explicit = tryMpPublicOrigin(process.env.MP_BACK_URL);
  if (explicit) return `${explicit}${normalizedPath}`;

  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ];

  for (const candidate of candidates) {
    const origin = tryMpPublicOrigin(candidate);
    if (origin) return `${origin}${normalizedPath}`;
  }

  throw new Error(
    'URL de retorno do Mercado Pago não configurada. Use NEXT_PUBLIC_APP_URL (https) ou MP_BACK_URL.'
  );
}

export function mpRecurringDates() {
  const end = new Date();
  end.setFullYear(end.getFullYear() + 10);

  return {
    start_date: new Date().toISOString(),
    end_date: end.toISOString(),
  };
}
