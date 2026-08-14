import type { SupabaseClient } from '@supabase/supabase-js';
import { mapRawMonthToProductionMonth } from '@/lib/admin/production-month';
import { isComboTerm, type BillingTerm } from '@/lib/checkout/combo-billing';
import { resolveCycleScheduledMonthKey } from '@/lib/subscriptions/combo-production-schedule';
import {
  countApprovedSubscriptionPayments,
  isMonthlySubscription,
  loyaltyLevelFromApprovedPayments,
  resolveMonthlyScheduledProductionMonth,
  resolveRenewalTargetCycleNumberForSubscription,
} from '@/lib/subscriptions/monthly-production-schedule';
import {
  findSubscriptionCycleForPayment,
  isPaymentAlreadyLinkedToSubscriptionCycle,
} from '@/lib/subscriptions/payment-cycle-link';
import { prepareBillingCyclePayments } from '@/lib/subscriptions/billing-cycle-payments';

const PROTECTED_CYCLE_STATUSES = new Set([
  'production',
  'preparing',
  'shipped',
  'delivered',
]);

const CYCLE_STATUS_RANK: Record<string, number> = {
  delivered: 6,
  shipped: 5,
  preparing: 4,
  production: 3,
  upcoming: 2,
  failed: 1,
  cancelled: 0,
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

/** Corrige data de compra do ciclo 1 com base no pagamento mais antigo / início da assinatura. */
export async function backfillMissingCyclePaymentLinks(
  supabase: SupabaseClient
): Promise<number> {
  const { data: cycles, error } = await supabase
    .from('subscription_cycles')
    .select('id, subscription_id, cycle_number, payment_id, paid_at')
    .eq('cycle_number', 1)
    .in('status', ['upcoming', 'production', 'preparing', 'shipped', 'delivered']);

  if (error || !cycles?.length) return 0;

  let updated = 0;

  for (const cycle of cycles) {
    const subscriptionId = cycle.subscription_id as string;
    const cyclePaidAt = cycle.paid_at as string | null;

    const [{ data: subscription }, { data: payments }] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('started_at')
        .eq('id', subscriptionId)
        .maybeSingle(),
      supabase
        .from('payments')
        .select('id, amount_cents, paid_at, created_at')
        .eq('subscription_id', subscriptionId)
        .eq('status', 'approved')
        .order('paid_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true }),
    ]);

    const approvedPayments = prepareBillingCyclePayments(payments ?? []);
    const earliestPayment = approvedPayments[0] ?? null;

    const candidates = [
      (subscription?.started_at as string | null) ?? null,
      earliestPayment
        ? ((earliestPayment.paid_at as string | null) ??
          (earliestPayment.created_at as string | null))
        : null,
    ].filter((value): value is string => Boolean(value));

    if (candidates.length === 0) continue;

    const canonicalPaidAt = candidates.sort((a, b) => a.localeCompare(b))[0]!;
    if (cyclePaidAt) continue;

    const patch: Record<string, unknown> = {
      paid_at: canonicalPaidAt,
      updated_at: new Date().toISOString(),
    };

    if (!cycle.payment_id && earliestPayment) {
      patch.payment_id = earliestPayment.id;
      patch.amount_cents = earliestPayment.amount_cents;
    }

    const { error: updateError } = await supabase
      .from('subscription_cycles')
      .update(patch)
      .eq('id', cycle.id);

    if (!updateError) updated += 1;
  }

  return updated;
}

interface CyclePaymentLink {
  id: string;
  amount_cents: number | null;
  paid_at: string | null;
}

/** Pagamento confirmado: ciclo entra na fila como Aguardando. */
export async function markCyclePreparing(
  supabase: SupabaseClient,
  subscriptionId: string,
  cycleNumber: number,
  payment: CyclePaymentLink,
  options?: { scheduledProductionMonth?: string }
) {
  await ensureSubscriptionCycle(supabase, subscriptionId, cycleNumber);

  const { data: existing } = await supabase
    .from('subscription_cycles')
    .select('payment_id, status')
    .eq('subscription_id', subscriptionId)
    .eq('cycle_number', cycleNumber)
    .maybeSingle();

  if (
    existing?.payment_id &&
    existing.payment_id !== payment.id
  ) {
    console.warn(
      '[cycles] markCyclePreparing skipped: cycle already has another payment',
      subscriptionId,
      cycleNumber
    );
    return;
  }

  let scheduledProductionMonth = options?.scheduledProductionMonth;
  if (!scheduledProductionMonth && payment.paid_at) {
    const monthly = await isMonthlySubscription(supabase, subscriptionId);
    if (monthly) {
      scheduledProductionMonth = await resolveMonthlyScheduledProductionMonth(
        supabase,
        subscriptionId,
        payment.paid_at,
        cycleNumber
      );
    }
  }

  const patch: Record<string, unknown> = {
    status: 'upcoming',
    payment_id: payment.id,
    paid_at: payment.paid_at,
    amount_cents: payment.amount_cents,
    updated_at: new Date().toISOString(),
  };

  if (scheduledProductionMonth) {
    patch.scheduled_production_month = scheduledProductionMonth;
  }

  const { error } = await supabase
    .from('subscription_cycles')
    .update(patch)
    .eq('subscription_id', subscriptionId)
    .eq('cycle_number', cycleNumber)
    .in('status', ['upcoming', 'production', 'preparing', 'failed']);

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
  const alreadyLinked = await isPaymentAlreadyLinkedToSubscriptionCycle(
    supabase,
    subscriptionId,
    payment.id
  );
  if (alreadyLinked) {
    const cycleNumber = await findSubscriptionCycleForPayment(
      supabase,
      subscriptionId,
      payment.id
    );
    return cycleNumber === 1 ? 'initial' : 'renewal';
  }

  const now = payment.paid_at ?? new Date().toISOString();

  const approvedCount = await countApprovedSubscriptionPayments(
    supabase,
    subscriptionId
  );

  const { data: cycle1 } = await supabase
    .from('subscription_cycles')
    .select('id, status, payment_id')
    .eq('subscription_id', subscriptionId)
    .eq('cycle_number', 1)
    .maybeSingle();

  const cycle1NeedsPayment =
    !cycle1 ||
    (['upcoming', 'failed'].includes(cycle1.status) && !cycle1.payment_id);

  if (approvedCount <= 1 && cycle1NeedsPayment) {
    await markCyclePreparing(supabase, subscriptionId, 1, payment);
    await removePrematureUpcomingCycles(supabase, subscriptionId);
    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_cycle: 1,
        loyalty_level: loyaltyLevelFromApprovedPayments(approvedCount),
        updated_at: now,
      })
      .eq('id', subscriptionId);
    return 'initial';
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('billing_term')
    .eq('id', subscriptionId)
    .maybeSingle();

  const billingTerm = (subscription?.billing_term as BillingTerm | null) ?? 'monthly';

  if (isComboTerm(billingTerm)) {
    const { count: existingCycles } = await supabase
      .from('subscription_cycles')
      .select('id', { count: 'exact', head: true })
      .eq('subscription_id', subscriptionId);

    const { seedPrepaidComboProductionSchedule } = await import(
      '@/lib/subscriptions/combo-production-schedule'
    );
    await seedPrepaidComboProductionSchedule(supabase, {
      subscriptionId,
      billingTerm,
      paymentLink: payment,
      anchorDate: payment.paid_at ? new Date(payment.paid_at) : new Date(),
      resyncOnly: (existingCycles ?? 0) > 0,
    });

    const paidCycleNumber = resolvePaidCycleNumber(currentCycle);
    const approvedPayments = approvedCount;
    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_cycle: Math.max(paidCycleNumber + 1, approvedPayments + 1),
        loyalty_level: loyaltyLevelFromApprovedPayments(approvedPayments),
        current_period_start: now,
        current_period_end: periodEndIso,
        next_billing_date: periodEndIso,
        updated_at: now,
      })
      .eq('id', subscriptionId);
    return 'renewal';
  }

  const paidCycleNumber = await resolveRenewalTargetCycleNumberForSubscription(
    supabase,
    subscriptionId
  );
  const scheduledProductionMonth = payment.paid_at
    ? await resolveMonthlyScheduledProductionMonth(
        supabase,
        subscriptionId,
        payment.paid_at,
        paidCycleNumber
      )
    : undefined;

  await markCyclePreparing(supabase, subscriptionId, paidCycleNumber, payment, {
    scheduledProductionMonth,
  });

  const approvedPayments = await countApprovedSubscriptionPayments(
    supabase,
    subscriptionId
  );
  const nextCycle = paidCycleNumber + 1;
  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_cycle: nextCycle,
      loyalty_level: loyaltyLevelFromApprovedPayments(approvedPayments),
      current_period_start: now,
      current_period_end: periodEndIso,
      next_billing_date: periodEndIso,
      updated_at: now,
    })
    .eq('id', subscriptionId);

  await ensureSubscriptionCycle(supabase, subscriptionId, nextCycle);
  return 'renewal';
}

/**
 * Ao cancelar assinatura: remove ciclos futuros sem pagamento e fixa o mês de
 * produção dos ciclos já pagos para não migrarem para o mês corrente.
 */
export async function cleanupSubscriptionCyclesOnCancel(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<{ removedUnpaidCycles: number; pinnedMonths: number }> {
  const now = new Date().toISOString();

  const { data: removed } = await supabase
    .from('subscription_cycles')
    .delete()
    .eq('subscription_id', subscriptionId)
    .eq('status', 'upcoming')
    .is('payment_id', null)
    .select('id');

  const { data: paidOpen } = await supabase
    .from('subscription_cycles')
    .select('id, paid_at, created_at, scheduled_production_month, payment_id')
    .eq('subscription_id', subscriptionId)
    .in('status', ['upcoming', 'production', 'preparing', 'shipped'])
    .not('payment_id', 'is', null);

  let pinnedMonths = 0;

  for (const cycle of paidOpen ?? []) {
    if (cycle.scheduled_production_month) continue;

    const rawMonth = resolveCycleScheduledMonthKey({
      scheduled_production_month: cycle.scheduled_production_month as
        | string
        | null,
      paid_at: cycle.paid_at as string | null,
      created_at: cycle.created_at as string | null,
    });
    if (!rawMonth) continue;

    const pinned = mapRawMonthToProductionMonth(rawMonth);
    const { error } = await supabase
      .from('subscription_cycles')
      .update({
        scheduled_production_month: `${pinned}-01`,
        updated_at: now,
      })
      .eq('id', cycle.id as string);

    if (!error) pinnedMonths += 1;
  }

  return {
    removedUnpaidCycles: removed?.length ?? 0,
    pinnedMonths,
  };
}

/** Remove ciclos duplicados e contadores adiantados por race no 1º pagamento. */
export async function repairDuplicateSubscriptionCycles(
  supabase: SupabaseClient
): Promise<{ removed: number; countersFixed: number }> {
  let removed = 0;
  let countersFixed = 0;

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id, current_cycle, billing_term')
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
        if (PROTECTED_CYCLE_STATUSES.has(dup.status as string)) continue;
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
      const billingTerm = (sub.billing_term as BillingTerm | null) ?? 'monthly';
      if (isComboTerm(billingTerm)) continue;

      await supabase
        .from('subscriptions')
        .update({ current_cycle: 1, updated_at: new Date().toISOString() })
        .eq('id', sub.id);
      countersFixed++;
    }
  }

  return { removed, countersFixed };
}

/**
 * Consolida ciclos sem alterar o status operacional dos pedidos no kanban.
 * Remove duplicatas, cria registro ausente e corrige contadores da assinatura.
 */
export async function consolidateSubscriptionCycles(
  supabase: SupabaseClient,
  options: { allowRepair?: boolean } = {}
): Promise<{
  created: number;
  removed: number;
  countersFixed: number;
  subscriptionCountersFixed: number;
}> {
  const allowRepair = options.allowRepair ?? true;
  const repair = allowRepair
    ? await repairDuplicateSubscriptionCycles(supabase)
    : { removed: 0, countersFixed: 0 };
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id, current_cycle')
    .in('status', ['active', 'past_due']);

  let created = 0;
  let subscriptionCountersFixed = 0;

  for (const sub of subs ?? []) {
    if (!sub.current_cycle || sub.current_cycle < 1) {
      await supabase
        .from('subscriptions')
        .update({ current_cycle: 1, updated_at: new Date().toISOString() })
        .eq('id', sub.id);
      subscriptionCountersFixed++;
    }

    const { count } = await supabase
      .from('subscription_cycles')
      .select('id', { count: 'exact', head: true })
      .eq('subscription_id', sub.id);

    if ((count ?? 0) > 0) continue;

    const { data: latestPayment } = await supabase
      .from('payments')
      .select('id, amount_cents, paid_at')
      .eq('subscription_id', sub.id)
      .eq('status', 'approved')
      .order('paid_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from('subscription_cycles').insert({
      subscription_id: sub.id,
      cycle_number: 1,
      status: 'upcoming',
      payment_id: latestPayment?.id ?? null,
      paid_at: latestPayment?.paid_at ?? null,
      amount_cents: latestPayment?.amount_cents ?? null,
    });

    if (!error) created++;
  }

  return {
    created,
    removed: repair.removed,
    countersFixed: repair.countersFixed,
    subscriptionCountersFixed,
  };
}

/** @deprecated Prefer consolidateSubscriptionCycles — não altera status no kanban. */
export async function backfillActiveSubscriptionCycles(
  supabase: SupabaseClient
): Promise<{
  created: number;
  updated: number;
  fixedCounters: number;
  removed: number;
  countersFixed: number;
}> {
  const result = await consolidateSubscriptionCycles(supabase);

  return {
    created: result.created,
    updated: 0,
    fixedCounters: result.subscriptionCountersFixed,
    removed: result.removed,
    countersFixed: result.countersFixed,
  };
}
