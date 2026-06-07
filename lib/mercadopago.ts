import MercadoPagoConfig, { Payment, PreApproval } from 'mercadopago';

export const MP_CONFIGURED = Boolean(process.env.MP_ACCESS_TOKEN);

export function assertMpConfigured() {
  if (!MP_CONFIGURED) {
    throw new Error('Mercado Pago não configurado (MP_ACCESS_TOKEN).');
  }
}

let mpConfig: MercadoPagoConfig | null = null;

function getMpConfig(): MercadoPagoConfig {
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

export function mpRecurringDates() {
  const start = new Date();
  start.setHours(start.getHours() + 1);

  const end = new Date();
  end.setFullYear(end.getFullYear() + 10);

  return {
    start_date: start.toISOString(),
    end_date: end.toISOString(),
  };
}
