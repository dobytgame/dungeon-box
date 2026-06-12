import { ASAAS_CONFIGURED } from '@/lib/asaas/client';
import { STRIPE_CONFIGURED } from '@/lib/stripe/server';

export type PaymentProvider = 'asaas' | 'stripe';

function normalizeProvider(raw: string | undefined): PaymentProvider | null {
  const value = raw?.trim().toLowerCase();
  if (value === 'asaas' || value === 'stripe') return value;
  return null;
}

/** Provedor ativo no checkout. Padrão: Asaas se configurado; senão Stripe. */
export function getPaymentProvider(): PaymentProvider | null {
  const explicit =
    normalizeProvider(process.env.PAYMENT_PROVIDER) ??
    normalizeProvider(process.env.NEXT_PUBLIC_PAYMENT_PROVIDER);

  if (explicit === 'asaas') {
    return ASAAS_CONFIGURED ? 'asaas' : null;
  }
  if (explicit === 'stripe') {
    return STRIPE_CONFIGURED ? 'stripe' : null;
  }

  if (ASAAS_CONFIGURED) return 'asaas';
  if (STRIPE_CONFIGURED) return 'stripe';
  return null;
}

export function isAsaasCheckout(): boolean {
  return getPaymentProvider() === 'asaas';
}

export function isStripeCheckout(): boolean {
  return getPaymentProvider() === 'stripe';
}
