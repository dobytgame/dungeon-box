import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';
import { assertStripePriceId } from '@/lib/stripe/prices';
import type { PlanSlug } from '@/lib/checkout/plans';
import { getOrCreateStripeCustomer } from '@/lib/stripe/customer';

export type PrepareStripeSubscriptionInput = {
  userId: string;
  planSlug: PlanSlug;
  planId: string;
  addressId: string;
  specialNotes: string | null;
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    cpf: string | null;
    stripe_customer_id: string | null;
  };
  retrySubscriptionId: string | null;
};

export type PrepareStripeSubscriptionResult = {
  clientSecret: string;
  subscriptionId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
};

function paymentIntentClientSecret(
  subscription: Stripe.Subscription
): string | null {
  const invoice = subscription.latest_invoice;
  if (!invoice || typeof invoice === 'string') return null;

  const confirmationSecret = invoice.confirmation_secret?.client_secret;
  if (confirmationSecret) return confirmationSecret;

  return null;
}

export async function prepareStripeSubscription(
  supabase: SupabaseClient,
  input: PrepareStripeSubscriptionInput
): Promise<PrepareStripeSubscriptionResult> {
  const stripe = getStripe();
  const priceId = assertStripePriceId(input.planSlug);
  const stripeCustomerId = await getOrCreateStripeCustomer(
    supabase,
    input.profile
  );

  if (input.retrySubscriptionId) {
    const { data: previous } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id')
      .eq('id', input.retrySubscriptionId)
      .eq('user_id', input.userId)
      .maybeSingle();

    if (previous?.stripe_subscription_id) {
      await cancelStripeSubscriptionBestEffort(previous.stripe_subscription_id);
    }
  }

  const stripeSubscription = await stripe.subscriptions.create({
    customer: stripeCustomerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.confirmation_secret'],
    metadata: {
      dungeonbox_user_id: input.userId,
      plan_slug: input.planSlug,
    },
  });

  const clientSecret = paymentIntentClientSecret(stripeSubscription);
  if (!clientSecret) {
    throw new Error('Stripe não retornou client secret para confirmar o pagamento.');
  }

  const row = {
    plan_id: input.planId,
    address_id: input.addressId,
    special_notes: input.specialNotes,
    status: 'pending' as const,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscription.id,
    updated_at: new Date().toISOString(),
  };

  let subscriptionId: string;

  if (input.retrySubscriptionId) {
    const { data, error } = await supabase
      .from('subscriptions')
      .update(row)
      .eq('id', input.retrySubscriptionId)
      .eq('user_id', input.userId)
      .eq('status', 'pending')
      .select('id')
      .single();

    if (error || !data) {
      await stripe.subscriptions.cancel(stripeSubscription.id);
      throw new Error('Não foi possível atualizar a assinatura.');
    }
    subscriptionId = data.id;
  } else {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: input.userId,
        ...row,
      })
      .select('id')
      .single();

    if (error || !data) {
      await stripe.subscriptions.cancel(stripeSubscription.id);
      throw new Error('Não foi possível salvar a assinatura.');
    }
    subscriptionId = data.id;
  }

  await stripe.subscriptions.update(stripeSubscription.id, {
    metadata: {
      dungeonbox_user_id: input.userId,
      dungeonbox_subscription_id: subscriptionId,
      plan_slug: input.planSlug,
    },
  });

  return {
    clientSecret,
    subscriptionId,
    stripeSubscriptionId: stripeSubscription.id,
    stripeCustomerId,
  };
}

export async function cancelStripeSubscriptionBestEffort(
  stripeSubscriptionId: string
) {
  try {
    const stripe = getStripe();
    await stripe.subscriptions.cancel(stripeSubscriptionId);
  } catch (error) {
    console.warn('[stripe] could not cancel subscription:', stripeSubscriptionId, error);
  }
}
