import type Stripe from 'stripe';

/** Stripe API recente expõe período nos itens da assinatura. */
export function getSubscriptionPeriodEnd(
  subscription: Stripe.Subscription
): number | null {
  const items = subscription.items?.data ?? [];
  if (!items.length) return null;
  return Math.max(...items.map((item) => item.current_period_end));
}

export function getSubscriptionPeriodStart(
  subscription: Stripe.Subscription
): number | null {
  const items = subscription.items?.data ?? [];
  if (!items.length) return null;
  return Math.min(...items.map((item) => item.current_period_start));
}
