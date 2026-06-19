import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureSubscriptionCycle } from '@/lib/subscriptions/cycles';

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

  await ensureSubscriptionCycle(supabase, subscriptionId, 1);

  return true;
}
