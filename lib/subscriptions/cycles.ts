import type { SupabaseClient } from '@supabase/supabase-js';

export async function ensureSubscriptionCycle(
  supabase: SupabaseClient,
  subscriptionId: string,
  cycleNumber: number
) {
  const { data: existing } = await supabase
    .from('subscription_cycles')
    .select('id')
    .eq('subscription_id', subscriptionId)
    .eq('cycle_number', cycleNumber)
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('subscription_cycles')
    .insert({
      subscription_id: subscriptionId,
      cycle_number: cycleNumber,
      status: 'upcoming',
    })
    .select('id')
    .single();

  if (error) {
    console.error('ensureSubscriptionCycle:', error);
    return null;
  }

  return data.id;
}
