import type { SupabaseClient } from '@supabase/supabase-js';

export async function findLocalSubscriptionByPagarmeId(
  supabase: SupabaseClient,
  pagarmeSubscriptionId: string
) {
  const { data } = await supabase
    .from('subscriptions')
    .select('id, user_id, status, pagarme_subscription_id, current_cycle')
    .eq('pagarme_subscription_id', pagarmeSubscriptionId)
    .maybeSingle();

  return data;
}

export async function findLocalSubscriptionByPagarmeMetadata(
  supabase: SupabaseClient,
  subscriptionId: string
) {
  const { data } = await supabase
    .from('subscriptions')
    .select('id, user_id, status, pagarme_subscription_id')
    .eq('id', subscriptionId)
    .maybeSingle();

  return data;
}
