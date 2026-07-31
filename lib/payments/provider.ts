import { ASAAS_CONFIGURED } from '@/lib/asaas/client';
import { PAGARME_CONFIGURED } from '@/lib/pagarme/client';
import { readActiveGatewayFromDb } from '@/lib/payments/gateway-config';
import { STRIPE_CONFIGURED } from '@/lib/stripe/server';

export type PaymentProvider = 'asaas' | 'pagarme' | 'stripe';

function normalizeProvider(raw: string | undefined): PaymentProvider | null {
  const value = raw?.trim().toLowerCase();
  if (value === 'asaas' || value === 'pagarme' || value === 'stripe') {
    return value;
  }
  return null;
}

function resolveFromEnv(): PaymentProvider | null {
  const explicit =
    normalizeProvider(process.env.PAYMENT_PROVIDER) ??
    normalizeProvider(process.env.NEXT_PUBLIC_PAYMENT_PROVIDER);

  if (explicit === 'asaas') {
    return ASAAS_CONFIGURED ? 'asaas' : null;
  }
  if (explicit === 'pagarme') {
    return PAGARME_CONFIGURED ? 'pagarme' : null;
  }
  if (explicit === 'stripe') {
    return STRIPE_CONFIGURED ? 'stripe' : null;
  }

  if (ASAAS_CONFIGURED) return 'asaas';
  if (PAGARME_CONFIGURED) return 'pagarme';
  if (STRIPE_CONFIGURED) return 'stripe';
  return null;
}

/** Provedor ativo no checkout (sync, env). Usado no client e como fallback. */
export function getPaymentProvider(): PaymentProvider | null {
  return resolveFromEnv();
}

/** Provedor ativo no checkout (async): admin → env → default. */
export async function getActivePaymentProvider(): Promise<PaymentProvider | null> {
  const fromDb = await readActiveGatewayFromDb();

  // Escolha do admin sempre vence — rotas de criação validam se o gateway está configurado.
  if (fromDb === 'pagarme' || fromDb === 'asaas') {
    return fromDb;
  }

  return resolveFromEnv();
}

export function isAsaasCheckout(): boolean {
  return getPaymentProvider() === 'asaas';
}

export function isPagarmeCheckout(): boolean {
  return getPaymentProvider() === 'pagarme';
}

export function isStripeCheckout(): boolean {
  return getPaymentProvider() === 'stripe';
}

export async function isActiveAsaasCheckout(): Promise<boolean> {
  return (await getActivePaymentProvider()) === 'asaas';
}

export async function isActivePagarmeCheckout(): Promise<boolean> {
  return (await getActivePaymentProvider()) === 'pagarme';
}
