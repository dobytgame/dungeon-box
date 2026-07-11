import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';
import { getInvoiceSubscriptionId } from '@/lib/stripe/invoice-subscription';
import { getSubscriptionPeriodEnd } from '@/lib/stripe/subscription-period';
import { activateSubscriptionFromStripe } from '@/lib/subscriptions/activate-stripe';
import { markCyclePreparing, processActiveSubscriptionPayment, cleanupSubscriptionCyclesOnCancel } from '@/lib/subscriptions/cycles';
import type { SubscriptionStatus } from '@/lib/dashboard/types';
import {
  notifyPurchaseCompleted,
  notifySubscriptionCancelled,
} from '@/lib/email/subscription-notify';

function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
): SubscriptionStatus | null {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'paused':
      return 'paused';
    case 'canceled':
      return 'cancelled';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'incomplete':
    case 'incomplete_expired':
      return 'pending';
    default:
      return null;
  }
}

async function findSubscriptionByStripeId(
  supabase: SupabaseClient,
  stripeSubscriptionId: string
) {
  const { data } = await supabase
    .from('subscriptions')
    .select('id, status, started_at, user_id, current_cycle')
    .eq('stripe_subscription_id', stripeSubscriptionId)
    .maybeSingle();
  return data;
}

export async function handleStripeSubscriptionUpdated(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription
): Promise<'processed' | 'skipped'> {
  const local = await findSubscriptionByStripeId(supabase, subscription.id);
  if (!local) return 'skipped';

  const mapped = mapStripeSubscriptionStatus(subscription.status);
  if (!mapped) return 'skipped';

  if (mapped === 'active' && local.status === 'pending') {
    await activateSubscriptionFromStripe(supabase, local.id, subscription);
    return 'processed';
  }

  if (mapped === local.status) return 'skipped';

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: mapped,
    updated_at: now,
  };

  if (mapped === 'cancelled') {
    updates.cancelled_at = now;
    updates.cancel_reason = 'Cancelado via Stripe';
  }

  if (mapped === 'active' && !local.started_at) {
    updates.started_at = now;
  }

  const periodEndUnix = getSubscriptionPeriodEnd(subscription);
  if (periodEndUnix) {
    const periodEnd = new Date(periodEndUnix * 1000).toISOString();
    updates.current_period_end = periodEnd;
    updates.next_billing_date = periodEnd;
  }

  await supabase.from('subscriptions').update(updates).eq('id', local.id);

  if (mapped === 'cancelled' && local.status !== 'cancelled') {
    await cleanupSubscriptionCyclesOnCancel(supabase, local.id);
    void notifySubscriptionCancelled(supabase, local.id).catch((err) => {
      console.error('[email] subscription cancelled notify failed:', err);
    });
  }

  return 'processed';
}

export async function handleStripeInvoicePaid(
  supabase: SupabaseClient,
  invoice: Stripe.Invoice
): Promise<'processed' | 'skipped'> {
  const stripeSubscriptionId = getInvoiceSubscriptionId(invoice);
  if (!stripeSubscriptionId) return 'skipped';

  const local = await findSubscriptionByStripeId(supabase, stripeSubscriptionId);
  if (!local) return 'skipped';

  const stripe = getStripe();
  const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);

  const amountCents = invoice.amount_paid ?? 0;
  const now = new Date().toISOString();
  const paymentIntentId: string | null = null;

  const { data: payment } = await supabase
    .from('payments')
    .upsert(
      {
        user_id: local.user_id,
        subscription_id: local.id,
        stripe_invoice_id: invoice.id,
        stripe_payment_intent_id: paymentIntentId,
        amount_cents: amountCents,
        currency: (invoice.currency ?? 'brl').toUpperCase().slice(0, 3),
        status: 'approved',
        paid_at: now,
      },
      { onConflict: 'stripe_invoice_id' }
    )
    .select('id, amount_cents')
    .single();

  if (local.status === 'pending') {
    await activateSubscriptionFromStripe(supabase, local.id, stripeSub);
    if (payment) {
      await markCyclePreparing(supabase, local.id, 1, {
        id: payment.id,
        amount_cents: payment.amount_cents,
        paid_at: now,
      });
    }
    void notifyPurchaseCompleted(supabase, local.id, amountCents, 1).catch(
      (err) => {
        console.error('[email] purchase completed notify failed:', err);
      }
    );
    return 'processed';
  }

  const periodEndUnix = getSubscriptionPeriodEnd(stripeSub);
  const periodEnd = periodEndUnix
    ? new Date(periodEndUnix * 1000).toISOString()
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  if (payment) {
    await processActiveSubscriptionPayment(
      supabase,
      local.id,
      local.current_cycle,
      {
        id: payment.id,
        amount_cents: payment.amount_cents,
        paid_at: now,
      },
      periodEnd
    );
  }

  return 'processed';
}
