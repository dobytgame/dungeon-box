import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateLoyaltyLevel } from '@/lib/subscriptions/loyalty';

const CYCLE_STATUS_RANK: Record<string, number> = {
  delivered: 6,
  shipped: 5,
  preparing: 4,
  upcoming: 3,
  failed: 2,
  cancelled: 1,
};

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
    if (error.code === '23505') {
      const { data: retry } = await supabase
        .from('subscription_cycles')
        .select('id')
        .eq('subscription_id', subscriptionId)
        .eq('cycle_number', cycleNumber)
        .maybeSingle();
      return retry?.id ?? null;
    }
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

async function removePrematureUpcomingCycles(
  supabase: SupabaseClient,
  subscriptionId: string
) {
  await supabase
    .from('subscription_cycles')
    .delete()
    .eq('subscription_id', subscriptionId)
    .gt('cycle_number', 1)
    .eq('status', 'upcoming')
    .is('payment_id', null);
}

/**
 * Pagamento confirmado em assinatura já ativa.
 * Distingue catch-up do 1º ciclo (evita criar ciclo 2 "aguardando") de renovação real.
 */
export async function processActiveSubscriptionPayment(
  supabase: SupabaseClient,
  subscriptionId: string,
  currentCycle: number | null | undefined,
  payment: CyclePaymentLink,
  periodEndIso: string
): Promise<'initial' | 'renewal'> {
  const now = payment.paid_at ?? new Date().toISOString();

  const { count: approvedCount } = await supabase
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('subscription_id', subscriptionId)
    .eq('status', 'approved');

  const { data: cycle1 } = await supabase
    .from('subscription_cycles')
    .select('id, status, payment_id')
    .eq('subscription_id', subscriptionId)
    .eq('cycle_number', 1)
    .maybeSingle();

  const cycle1NeedsPayment =
    !cycle1 ||
    (['upcoming', 'failed'].includes(cycle1.status) && !cycle1.payment_id);

  if ((approvedCount ?? 0) <= 1 && cycle1NeedsPayment) {
    await markCyclePreparing(supabase, subscriptionId, 1, payment);
    await removePrematureUpcomingCycles(supabase, subscriptionId);
    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_cycle: 1,
        updated_at: now,
      })
      .eq('id', subscriptionId);
    return 'initial';
  }

  const paidCycleNumber = resolvePaidCycleNumber(currentCycle);
  await markCyclePreparing(supabase, subscriptionId, paidCycleNumber, payment);

  const nextCycle = paidCycleNumber + 1;
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_cycle: nextCycle,
      loyalty_level: calculateLoyaltyLevel(nextCycle - 1),
      current_period_start: now,
      current_period_end: periodEndIso,
      next_billing_date: periodEndIso,
      updated_at: now,
    })
    .eq('id', subscriptionId);

  await ensureSubscriptionCycle(supabase, subscriptionId, nextCycle);
  return 'renewal';
}

/** Remove ciclos duplicados e contadores adiantados por race no 1º pagamento. */
export async function repairDuplicateSubscriptionCycles(
  supabase: SupabaseClient
): Promise<{ removed: number; countersFixed: number }> {
  let removed = 0;
  let countersFixed = 0;

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id, current_cycle')
    .in('status', ['active', 'past_due']);

  for (const sub of subs ?? []) {
    const { data: cycles } = await supabase
      .from('subscription_cycles')
      .select('id, cycle_number, status, payment_id')
      .eq('subscription_id', sub.id);

    const byNumber = new Map<number, typeof cycles>();
    for (const cycle of cycles ?? []) {
      const list = byNumber.get(cycle.cycle_number) ?? [];
      list.push(cycle);
      byNumber.set(cycle.cycle_number, list);
    }

    for (const rows of Array.from(byNumber.values())) {
      if (!rows || rows.length <= 1) continue;
      const sorted = [...rows].sort((a, b) => {
        const statusDiff =
          (CYCLE_STATUS_RANK[b.status] ?? 0) -
          (CYCLE_STATUS_RANK[a.status] ?? 0);
        if (statusDiff !== 0) return statusDiff;
        const paymentDiff =
          Number(Boolean(b.payment_id)) - Number(Boolean(a.payment_id));
        if (paymentDiff !== 0) return paymentDiff;
        return b.id.localeCompare(a.id);
      });
      for (const dup of sorted.slice(1)) {
        await supabase.from('subscription_cycles').delete().eq('id', dup.id);
        removed++;
      }
    }

    const { count: paymentCount } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('subscription_id', sub.id)
      .eq('status', 'approved');

    if ((paymentCount ?? 0) > 1) continue;

    const { data: premature } = await supabase
      .from('subscription_cycles')
      .select('id')
      .eq('subscription_id', sub.id)
      .gt('cycle_number', 1)
      .eq('status', 'upcoming')
      .is('payment_id', null);

    if (premature?.length) {
      await supabase
        .from('subscription_cycles')
        .delete()
        .in(
          'id',
          premature.map((row) => row.id)
        );
      removed += premature.length;
    }

    if ((sub.current_cycle ?? 1) > 1) {
      await supabase
        .from('subscriptions')
        .update({ current_cycle: 1, updated_at: new Date().toISOString() })
        .eq('id', sub.id);
      countersFixed++;
    }
  }

  return { removed, countersFixed };
}

/** Repara ciclos ausentes ou presos em upcoming para assinaturas já ativas. */
export async function backfillActiveSubscriptionCycles(
  supabase: SupabaseClient
): Promise<{
  created: number;
  updated: number;
  fixedCounters: number;
  removed: number;
  countersFixed: number;
}> {
  const repair = await repairDuplicateSubscriptionCycles(supabase);
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

  return {
    created,
    updated,
    fixedCounters,
    removed: repair.removed,
    countersFixed: repair.countersFixed,
  };
}
