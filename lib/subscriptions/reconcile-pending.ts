import type { SupabaseClient } from '@supabase/supabase-js';
import { reconcilePendingAsaasSubscription } from '@/lib/asaas/reconcile-pending';
import { syncAsaasSubscriptionPayments } from '@/lib/asaas/payment-sync';
import { reconcilePendingStripeSubscription } from '@/lib/stripe/payment-sync';

export type PendingSubscription = {
  id: string;
  status: string;
  asaas_subscription_id?: string | null;
  asaas_customer_id?: string | null;
  billing_term?: string | null;
  stripe_subscription_id?: string | null;
};

export async function reconcilePendingSubscription(
  subscription: PendingSubscription,
  supabase?: SupabaseClient
): Promise<void> {
  if (subscription.status !== 'pending') {
    return;
  }

  if (subscription.asaas_subscription_id || subscription.asaas_customer_id) {
    if (!supabase) {
      const { createAdminClient } = await import('@/lib/supabase/admin');
      await reconcilePendingAsaasSubscription(
        createAdminClient(),
        subscription
      );
    } else {
      await reconcilePendingAsaasSubscription(supabase, subscription);
    }
    return;
  }

  if (subscription.stripe_subscription_id) {
    await reconcilePendingStripeSubscription(subscription);
  }
}

export async function reconcilePendingSubscriptions(
  subscriptions: PendingSubscription[],
  supabase?: SupabaseClient
): Promise<void> {
  const pending = subscriptions.filter((sub) => sub.status === 'pending');
  if (pending.length === 0) {
    return;
  }

  for (const subscription of pending) {
    await reconcilePendingSubscription(subscription, supabase);
  }
}
