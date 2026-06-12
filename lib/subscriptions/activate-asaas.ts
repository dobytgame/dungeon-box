import type { SupabaseClient } from '@supabase/supabase-js';

/** Ativa assinatura local quando o Asaas confirma pagamento da assinatura. */
export async function activateSubscriptionFromAsaas(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<boolean> {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
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
    console.error('activateSubscriptionFromAsaas update:', updateError);
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
