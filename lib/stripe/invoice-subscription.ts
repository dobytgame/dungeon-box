import type Stripe from 'stripe';

export function getInvoiceSubscriptionId(
  invoice: Stripe.Invoice
): string | null {
  const subscription = invoice.parent?.subscription_details?.subscription;
  if (!subscription) return null;
  return typeof subscription === 'string' ? subscription : subscription.id;
}
