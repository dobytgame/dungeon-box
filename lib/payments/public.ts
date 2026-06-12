import { STRIPE_PUBLISHABLE_KEY } from '@/lib/stripe/public';

const explicit = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER?.trim().toLowerCase();

export const ACTIVE_PAYMENT_PROVIDER: 'asaas' | 'stripe' =
  explicit === 'stripe' || explicit === 'asaas' ? explicit : 'asaas';

export const ASAAS_CHECKOUT_READY = ACTIVE_PAYMENT_PROVIDER === 'asaas';

export const STRIPE_CHECKOUT_ACTIVE =
  ACTIVE_PAYMENT_PROVIDER === 'stripe' && Boolean(STRIPE_PUBLISHABLE_KEY);
