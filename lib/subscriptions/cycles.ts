import type { SupabaseClient } from '@supabase/supabase-js';

export function resolvePaidCycleNumber(
  currentCycle: number | null | undefined
): number {
  const value = currentCycle ?? 0;
  return value > 0 ? value : 1;
}

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

interface CyclePaymentLink {
  id: string;
  amount_cents: number | null;
  paid_at: string | null;
}

/** Marca o ciclo pago como em produção e vincula o pagamento. */
export async function markCyclePreparing(
  supabase: SupabaseClient,
  subscriptionId: string,
  cycleNumber: number,
  payment: CyclePaymentLink
) {
  await ensureSubscriptionCycle(supabase, subscriptionId, cycleNumber);

  const { error } = await supabase
    .from('subscription_cycles')
    .update({
      status: 'preparing',
      payment_id: payment.id,
      paid_at: payment.paid_at,
      amount_cents: payment.amount_cents,
      updated_at: new Date().toISOString(),
    })
    .eq('subscription_id', subscriptionId)
    .eq('cycle_number', cycleNumber)
    .in('status', ['upcoming', 'preparing', 'failed']);

  if (error) {
    console.error('markCyclePreparing:', error);
  }
}

/** Repara ciclos ausentes ou presos em upcoming para assinaturas já ativas. */
export async function backfillActiveSubscriptionCycles(
  supabase: SupabaseClient
): Promise<{ created: number; updated: number; fixedCounters: number }> {
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id, current_cycle')
    .in('status', ['active', 'past_due']);

  let created = 0;
  let updated = 0;
  let fixedCounters = 0;

  for (const sub of subs ?? []) {
    if (!sub.current_cycle || sub.current_cycle < 1) {
      await supabase
        .from('subscriptions')
        .update({ current_cycle: 1, updated_at: new Date().toISOString() })
        .eq('id', sub.id);
      fixedCounters++;
    }

    const { data: latestPayment } = await supabase
      .from('payments')
      .select('id, amount_cents, paid_at')
      .eq('subscription_id', sub.id)
      .eq('status', 'approved')
      .order('paid_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    const { count } = await supabase
      .from('subscription_cycles')
      .select('id', { count: 'exact', head: true })
      .eq('subscription_id', sub.id);

    if ((count ?? 0) === 0) {
      const { error } = await supabase.from('subscription_cycles').insert({
        subscription_id: sub.id,
        cycle_number: 1,
        status: latestPayment ? 'preparing' : 'upcoming',
        payment_id: latestPayment?.id ?? null,
        paid_at: latestPayment?.paid_at ?? null,
        amount_cents: latestPayment?.amount_cents ?? null,
      });

      if (!error) created++;
      continue;
    }

    if (!latestPayment) continue;

    const { data: stuckCycles } = await supabase
      .from('subscription_cycles')
      .select('id, status')
      .eq('subscription_id', sub.id)
      .in('status', ['upcoming', 'failed'])
      .order('cycle_number', { ascending: true })
      .limit(1);

    const targetCycle = stuckCycles?.[0];
    if (targetCycle) {
      const { error } = await supabase
        .from('subscription_cycles')
        .update({
          status: 'preparing',
          payment_id: latestPayment.id,
          paid_at: latestPayment.paid_at,
          amount_cents: latestPayment.amount_cents,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetCycle.id);

      if (!error) updated++;
    }
  }

  return { created, updated, fixedCounters };
}
