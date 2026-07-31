import { STRIPE_PUBLISHABLE_KEY } from '@/lib/stripe/public';
import { PAGARME_TOKENIZATION_READY } from '@/lib/pagarme/public';

const explicit = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER?.trim().toLowerCase();

export const ACTIVE_PAYMENT_PROVIDER: 'asaas' | 'pagarme' | 'stripe' =
  explicit === 'stripe' || explicit === 'pagarme' || explicit === 'asaas'
    ? explicit
    : 'asaas';

export const ASAAS_CHECKOUT_READY = ACTIVE_PAYMENT_PROVIDER === 'asaas';

export const PAGARME_CHECKOUT_READY =
  ACTIVE_PAYMENT_PROVIDER === 'pagarme' && PAGARME_TOKENIZATION_READY;

export const STRIPE_CHECKOUT_ACTIVE =
  ACTIVE_PAYMENT_PROVIDER === 'stripe' && Boolean(STRIPE_PUBLISHABLE_KEY);

export type CheckoutProvider = 'asaas' | 'pagarme' | 'stripe';

export function isCheckoutProvider(value: string): value is CheckoutProvider {
  return value === 'asaas' || value === 'pagarme' || value === 'stripe';
}
