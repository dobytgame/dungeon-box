import type { SupabaseClient } from '@supabase/supabase-js';
import { monthKeyFromDate } from '@/lib/admin/chart-period';
import { mapRawMonthToProductionMonth } from '@/lib/admin/production-month';
import { isComboTerm, type BillingTerm } from '@/lib/checkout/combo-billing';
import type { CycleStatus } from '@/lib/dashboard/types';
import { calculateLoyaltyLevel } from '@/lib/subscriptions/loyalty';
import { resolveCycleScheduledMonthKey } from '@/lib/subscriptions/combo-production-schedule';

const OPEN_CYCLE_STATUSES = new Set<CycleStatus>([
  'upcoming',
  'production',
  'preparing',
  'shipped',
]);

type CycleMonthRow = {
  cycle_number: number;
  status: string;
  paid_at: string | null;
  created_at: string | null;
  scheduled_production_month: string | null;
  payment_id: string | null;
};

export function addMonthsToMonthKey(monthKey: string, months: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1 + months, 1);
  return monthKeyFromDate(date);
}

export function resolveCycleProductionMonthKey(row: CycleMonthRow): string | null {
  const raw = resolveCycleScheduledMonthKey({
    scheduled_production_month: row.scheduled_production_month,
    paid_at: row.paid_at,
    created_at: row.created_at,
  });
  if (!raw) return null;
  return mapRawMonthToProductionMonth(raw);
}

export function bumpProductionMonthWhileOccupied(
  candidate: string,
  occupied: Set<string>
): string {
  let target = candidate;
  while (occupied.has(target)) {
    target = addMonthsToMonthKey(target, 1);
  }
  return target;
}

export function collectOccupiedProductionMonths(
  cycles: CycleMonthRow[],
  options?: { excludeCycleNumber?: number }
): Set<string> {
  const occupied = new Set<string>();

  for (const cycle of cycles) {
    if (options?.excludeCycleNumber === cycle.cycle_number) continue;
    if (!cycle.payment_id) continue;
    if (!OPEN_CYCLE_STATUSES.has(cycle.status as CycleStatus)) continue;

    const monthKey = resolveCycleProductionMonthKey(cycle);
    if (monthKey) occupied.add(monthKey);
  }

  return occupied;
}

export function resolveMonthlyProductionMonthKey(
  paymentPaidAt: string,
  occupied: Set<string>
): string {
  const rawMonth = monthKeyFromDate(new Date(paymentPaidAt));
  const candidate = mapRawMonthToProductionMonth(rawMonth);
  return bumpProductionMonthWhileOccupied(candidate, occupied);
}

export function resolveRenewalTargetCycleNumber(
  cycles: Array<Pick<CycleMonthRow, 'cycle_number' | 'status' | 'payment_id'>>
): number {
  if (!cycles.length) return 1;

  const sorted = [...cycles].sort(
    (a, b) => a.cycle_number - b.cycle_number
  );

  const unpaidUpcoming = sorted.find(
    (cycle) =>
      !cycle.payment_id &&
      (cycle.status === 'upcoming' || cycle.status === 'failed')
  );
  if (unpaidUpcoming) return unpaidUpcoming.cycle_number;

  const maxCycleNumber = sorted.reduce(
    (max, cycle) => Math.max(max, cycle.cycle_number),
    0
  );
  return maxCycleNumber + 1;
}

export async function loadSubscriptionCycleMonthRows(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<CycleMonthRow[]> {
  const { data, error } = await supabase
    .from('subscription_cycles')
    .select(
      'cycle_number, status, paid_at, created_at, scheduled_production_month, payment_id'
    )
    .eq('subscription_id', subscriptionId)
    .order('cycle_number', { ascending: true });

  if (error) {
    console.error('[monthly-production] load cycles:', error.message);
    return [];
  }

  return (data ?? []) as CycleMonthRow[];
}

export async function resolveMonthlyScheduledProductionMonth(
  supabase: SupabaseClient,
  subscriptionId: string,
  paymentPaidAt: string,
  targetCycleNumber: number
): Promise<string> {
  const cycles = await loadSubscriptionCycleMonthRows(supabase, subscriptionId);
  const occupied = collectOccupiedProductionMonths(cycles, {
    excludeCycleNumber: targetCycleNumber,
  });
  const monthKey = resolveMonthlyProductionMonthKey(paymentPaidAt, occupied);
  return `${monthKey}-01`;
}

export async function resolveRenewalTargetCycleNumberForSubscription(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<number> {
  const cycles = await loadSubscriptionCycleMonthRows(supabase, subscriptionId);
  return resolveRenewalTargetCycleNumber(cycles);
}

export async function countApprovedSubscriptionPayments(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('subscription_id', subscriptionId)
    .eq('status', 'approved');

  if (error) {
    console.error('[monthly-production] count payments:', error.message);
    return 0;
  }

  return count ?? 0;
}

export function loyaltyLevelFromApprovedPayments(approvedPayments: number): number {
  return calculateLoyaltyLevel(Math.max(1, approvedPayments));
}

export async function isMonthlySubscription(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('subscriptions')
    .select('billing_term')
    .eq('id', subscriptionId)
    .maybeSingle();

  const billingTerm = (data?.billing_term as BillingTerm | null) ?? 'monthly';
  return !isComboTerm(billingTerm);
}

/** Corrige meses de produção e fidelidade em assinaturas mensais já afetadas. */
export async function repairMonthlyProductionMonthsAndLoyalty(
  supabase: SupabaseClient
): Promise<{
  monthsFixed: number;
  loyaltyFixed: number;
  renewalCyclesAttached: number;
}> {
  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('id, billing_term, loyalty_level')
    .in('status', ['active', 'past_due', 'cancelled']);

  if (error || !subs?.length) {
    return { monthsFixed: 0, loyaltyFixed: 0, renewalCyclesAttached: 0 };
  }

  let monthsFixed = 0;
  let loyaltyFixed = 0;
  let renewalCyclesAttached = 0;
  const now = new Date().toISOString();

  for (const sub of subs) {
    const billingTerm = (sub.billing_term as BillingTerm | null) ?? 'monthly';
    if (isComboTerm(billingTerm)) continue;

    const subscriptionId = sub.id as string;

    const { data: approvedPayments } = await supabase
      .from('payments')
      .select('id, amount_cents, paid_at, created_at')
      .eq('subscription_id', subscriptionId)
      .eq('status', 'approved')
      .order('paid_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    const linkedPaymentIds = new Set<string>();
    let cycles = await loadSubscriptionCycleMonthRows(supabase, subscriptionId);
    for (const cycle of cycles) {
      if (cycle.payment_id) linkedPaymentIds.add(cycle.payment_id);
    }

    for (const payment of approvedPayments ?? []) {
      if (linkedPaymentIds.has(payment.id as string)) continue;

      const paidAt =
        (payment.paid_at as string | null) ??
        (payment.created_at as string | null) ??
        now;
      const cycleNumber = resolveRenewalTargetCycleNumber(cycles);
      const scheduledProductionMonth = await resolveMonthlyScheduledProductionMonth(
        supabase,
        subscriptionId,
        paidAt,
        cycleNumber
      );

      await supabase.from('subscription_cycles').upsert(
        {
          subscription_id: subscriptionId,
          cycle_number: cycleNumber,
          status: 'upcoming',
          payment_id: payment.id,
          paid_at: paidAt,
          amount_cents: payment.amount_cents,
          scheduled_production_month: scheduledProductionMonth,
          updated_at: now,
        },
        { onConflict: 'subscription_id,cycle_number' }
      );

      linkedPaymentIds.add(payment.id as string);
      cycles = await loadSubscriptionCycleMonthRows(supabase, subscriptionId);
      renewalCyclesAttached += 1;
    }

    const paidCycles = cycles.filter((cycle) => Boolean(cycle.payment_id));

    const occupied = new Set<string>();
    for (const cycle of [...paidCycles].sort(
      (a, b) => a.cycle_number - b.cycle_number
    )) {
      const paymentAnchor = cycle.paid_at ?? cycle.created_at;
      if (!paymentAnchor) continue;

      const monthKey = resolveMonthlyProductionMonthKey(paymentAnchor, occupied);
      occupied.add(monthKey);

      const scheduled = `${monthKey}-01`;
      if (cycle.scheduled_production_month === scheduled) continue;

      const { error: updateError } = await supabase
        .from('subscription_cycles')
        .update({
          scheduled_production_month: scheduled,
          updated_at: now,
        })
        .eq('subscription_id', subscriptionId)
        .eq('cycle_number', cycle.cycle_number);

      if (!updateError) monthsFixed += 1;
    }

    const approvedPaymentCount = await countApprovedSubscriptionPayments(
      supabase,
      subscriptionId
    );
    if (approvedPaymentCount <= 0) continue;

    const expectedLoyalty = loyaltyLevelFromApprovedPayments(approvedPaymentCount);
    if ((sub.loyalty_level as number) === expectedLoyalty) continue;

    const { error: loyaltyError } = await supabase
      .from('subscriptions')
      .update({
        loyalty_level: expectedLoyalty,
        current_cycle: approvedPaymentCount + 1,
        updated_at: now,
      })
      .eq('id', subscriptionId);

    if (!loyaltyError) loyaltyFixed += 1;
  }

  return { monthsFixed, loyaltyFixed, renewalCyclesAttached };
}
