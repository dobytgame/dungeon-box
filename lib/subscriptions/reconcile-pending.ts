import { reconcilePendingAsaasSubscription } from '@/lib/asaas/payment-sync';
import { reconcilePendingStripeSubscription } from '@/lib/stripe/payment-sync';

type PendingSubscription = {
  id: string;
  status: string;
  asaas_subscription_id?: string | null;
  stripe_subscription_id?: string | null;
};

export async function reconcilePendingSubscription(
  subscription: PendingSubscription
): Promise<void> {
  if (subscription.status !== 'pending') {
    return;
  }

  if (subscription.asaas_subscription_id) {
    await reconcilePendingAsaasSubscription(subscription);
    return;
  }

  if (subscription.stripe_subscription_id) {
    await reconcilePendingStripeSubscription(subscription);
  }
}

export async function reconcilePendingSubscriptions(
  subscriptions: PendingSubscription[]
): Promise<void> {
  const pending = subscriptions.filter((sub) => sub.status === 'pending');
  if (pending.length === 0) {
    return;
  }

  for (const subscription of pending) {
    await reconcilePendingSubscription(subscription);
  }
}
