import type { SupabaseClient } from '@supabase/supabase-js';

interface MpPreApprovalLike {
  status?: string;
  payer_id?: number | string | null;
}

/** Ativa assinatura e cria ciclo 1 quando o MP autoriza a pré-aprovação. */
export async function activateSubscriptionFromMp(
  supabase: SupabaseClient,
  subscriptionId: string,
  mpSub: MpPreApprovalLike
): Promise<boolean> {
  if (mpSub.status !== 'authorized') return false;

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  const nowIso = now.toISOString();

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      mp_payer_id: mpSub.payer_id != null ? String(mpSub.payer_id) : null,
      started_at: nowIso,
      current_period_start: nowIso,
      current_period_end: periodEnd.toISOString(),
      next_billing_date: periodEnd.toISOString(),
      current_cycle: 1,
      updated_at: nowIso,
    })
    .eq('id', subscriptionId)
    .eq('status', 'pending');

  if (updateError) {
    console.error('activateSubscriptionFromMp update:', updateError);
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
