import Stripe from 'stripe';

export const STRIPE_CONFIGURED = Boolean(process.env.STRIPE_SECRET_KEY);

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error('Stripe não configurado (STRIPE_SECRET_KEY).');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, {
      typescript: true,
    });
  }
  return stripeClient;
}
