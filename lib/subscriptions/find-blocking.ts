import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExistingSubscriptionRow } from '@/lib/subscriptions/pending-checkout';
import { BLOCKING_SUBSCRIPTION_STATUSES } from '@/lib/subscriptions/blocking-statuses';

export async function findBlockingSubscriptionForPlan(
  supabase: SupabaseClient,
  userId: string,
  planId: string
): Promise<ExistingSubscriptionRow | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select(
      'id, status, mp_subscription_id, stripe_subscription_id, asaas_subscription_id, pagarme_subscription_id'
    )
    .eq('user_id', userId)
    .eq('plan_id', planId)
    .in('status', [...BLOCKING_SUBSCRIPTION_STATUSES])
    .maybeSingle();

  return data;
}
