import { createAdminClient } from '@/lib/supabase/admin';
import {
  resolvePendingPaymentLinkForSubscription,
  type PendingPaymentLink,
} from '@/lib/payments/pending-payment-link';

export type CustomerSubscriptionPaymentLink = PendingPaymentLink & {
  subscriptionId: string;
};

export async function getCustomerSubscriptionPaymentLink(
  userId: string,
  subscriptionId: string
): Promise<CustomerSubscriptionPaymentLink | null> {
  const admin = createAdminClient();

  const { data: subscription } = await admin
    .from('subscriptions')
    .select('id, user_id, status, is_partner')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription || subscription.user_id !== userId) {
    return null;
  }

  if (
    subscription.is_partner ||
    (subscription.status !== 'pending' && subscription.status !== 'past_due')
  ) {
    return null;
  }

  const result = await resolvePendingPaymentLinkForSubscription(
    admin,
    subscriptionId
  );

  if (!result.ok) {
    return null;
  }

  return {
    subscriptionId,
    ...result.link,
  };
}

export async function getCustomerPaymentLinks(
  userId: string,
  subscriptionIds: string[]
): Promise<CustomerSubscriptionPaymentLink[]> {
  const links = await Promise.all(
    subscriptionIds.map((id) => getCustomerSubscriptionPaymentLink(userId, id))
  );
  return links.filter((link): link is CustomerSubscriptionPaymentLink => link != null);
}
