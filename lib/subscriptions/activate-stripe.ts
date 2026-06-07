import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import {
  getSubscriptionPeriodEnd,
} from '@/lib/stripe/subscription-period';

/** Ativa assinatura local quando o Stripe confirma pagamento/assinatura. */
export async function activateSubscriptionFromStripe(
  supabase: SupabaseClient,
  subscriptionId: string,
  stripeSub: Pick<Stripe.Subscription, 'status' | 'items'>
): Promise<boolean> {
  if (stripeSub.status !== 'active' && stripeSub.status !== 'trialing') {
    return false;
  }

  const now = new Date();
  const periodEndUnix = getSubscriptionPeriodEnd(
    stripeSub as Stripe.Subscription
  );
  const periodEnd = periodEndUnix
    ? new Date(periodEndUnix * 1000)
    : new Date(now.getTime());
  if (!periodEndUnix) {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  const nowIso = now.toISOString();

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      started_at: nowIso,
      current_period_start: nowIso,
      current_period_end: periodEnd.toISOString(),
      next_billing_date: periodEnd.toISOString(),
      current_cycle: 1,
      updated_at: nowIso,
    })
    .eq('id', subscriptionId)
    .in('status', ['pending', 'past_due']);

  if (updateError) {
    console.error('activateSubscriptionFromStripe update:', updateError);
    return false;
  }

  const { data: existingCycle } = await supabase
    .from('subscription_cycles')
    .select('id')
    .eq('subscription_id', subscriptionId)
    .eq('cycle_number', 1)
    .maybeSingle();

  if (!existingCycle) {
    await supabase.from('subscription_cycles').insert({
      subscription_id: subscriptionId,
      cycle_number: 1,
      status: 'upcoming',
    });
  }

  return true;
}
