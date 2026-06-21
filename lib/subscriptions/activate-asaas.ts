import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureSubscriptionCycle } from '@/lib/subscriptions/cycles';

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/** Ativa assinatura local quando o Asaas confirma pagamento da assinatura. */
export async function activateSubscriptionFromAsaas(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<boolean> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('prepaid_until, prepaid_months, billing_term')
    .eq('id', subscriptionId)
    .maybeSingle();

  const now = new Date();
  const prepaidUntil = subscription?.prepaid_until
    ? new Date(subscription.prepaid_until)
    : subscription?.prepaid_months
      ? addMonths(now, subscription.prepaid_months)
      : null;

  const periodEnd = prepaidUntil ?? addMonths(now, 1);
  const nowIso = now.toISOString();

  const { data, error: updateError } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      started_at: nowIso,
      current_period_start: nowIso,
      current_period_end: periodEnd.toISOString(),
      next_billing_date: periodEnd.toISOString(),
      prepaid_until: prepaidUntil?.toISOString() ?? null,
      current_cycle: 1,
      updated_at: nowIso,
    })
    .eq('id', subscriptionId)
    .in('status', ['pending', 'past_due'])
    .select('id')
    .maybeSingle();

  if (updateError) {
    console.error('activateSubscriptionFromAsaas update:', updateError);
    return false;
  }

  if (!data) {
    const { data: current } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('id', subscriptionId)
      .maybeSingle();

    if (current?.status === 'active') {
      await ensureSubscriptionCycle(supabase, subscriptionId, 1);
      return true;
    }

    console.error(
      'activateSubscriptionFromAsaas: subscription not pending:',
      subscriptionId
    );
    return false;
  }

  await ensureSubscriptionCycle(supabase, subscriptionId, 1);
  return true;
}
