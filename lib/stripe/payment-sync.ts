import type { SupabaseClient } from '@supabase/supabase-js';
import { getStripe, STRIPE_CONFIGURED } from '@/lib/stripe/server';
import {
  handleStripeInvoicePaid,
  handleStripeSubscriptionUpdated,
} from '@/lib/stripe/webhook-handlers';
import { activateSubscriptionFromStripe } from '@/lib/subscriptions/activate-stripe';
import { markCyclePreparing } from '@/lib/subscriptions/cycles';
import { createAdminClient } from '@/lib/supabase/admin';

async function reconcileWithAdmin(
  subscription: {
    id: string;
    status: string;
    stripe_subscription_id?: string | null;
  },
  supabase: SupabaseClient
): Promise<boolean> {
  if (
    subscription.status !== 'pending' ||
    !subscription.stripe_subscription_id ||
    !STRIPE_CONFIGURED
  ) {
    return false;
  }

  const stripe = getStripe();
  const stripeSub = await stripe.subscriptions.retrieve(
    subscription.stripe_subscription_id
  );

  if (stripeSub.status === 'active' || stripeSub.status === 'trialing') {
    const activated = await activateSubscriptionFromStripe(
      supabase,
      subscription.id,
      stripeSub
    );

    const invoices = await stripe.invoices.list({
      subscription: stripeSub.id,
      status: 'paid',
      limit: 1,
    });

    const invoice = invoices.data[0];
    if (invoice) {
      await handleStripeInvoicePaid(supabase, invoice);
      return true;
    }

    if (activated) {
      const { data: payment } = await supabase
        .from('payments')
        .select('id, amount_cents, paid_at')
        .eq('subscription_id', subscription.id)
        .eq('status', 'approved')
        .order('paid_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (payment) {
        await markCyclePreparing(supabase, subscription.id, 1, {
          id: payment.id,
          amount_cents: payment.amount_cents,
          paid_at: payment.paid_at,
        });
      }
      return true;
    }
  }

  if (
    stripeSub.status === 'incomplete' ||
    stripeSub.status === 'incomplete_expired' ||
    stripeSub.status === 'canceled'
  ) {
    return false;
  }

  await handleStripeSubscriptionUpdated(supabase, stripeSub);
  return stripeSub.status === 'active' || stripeSub.status === 'trialing';
}

export async function reconcilePendingStripeSubscription(subscription: {
  id: string;
  status: string;
  stripe_subscription_id?: string | null;
}): Promise<void> {
  if (
    subscription.status !== 'pending' ||
    !subscription.stripe_subscription_id
  ) {
    return;
  }

  try {
    const admin = createAdminClient();
    await reconcileWithAdmin(subscription, admin);
  } catch (error) {
    console.error('[stripe] reconcile pending subscription:', error);
  }
}
