import type { SupabaseClient } from '@supabase/supabase-js';
import { monthKeyFromDate } from '@/lib/admin/chart-period';
import { mapRawMonthToProductionMonth } from '@/lib/admin/production-month';
import { isComboTerm, type BillingTerm } from '@/lib/checkout/combo-billing';
import type { CycleStatus } from '@/lib/dashboard/types';
import { calculateLoyaltyLevel } from '@/lib/subscriptions/loyalty';
import { resolveCycleScheduledMonthKey } from '@/lib/subscriptions/combo-production-schedule';
import {
  prepareBillingCyclePayments,
  type BillingPaymentRow,
} from '@/lib/subscriptions/billing-cycle-payments';

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
  options?: { excludeCycleNumber?: number; openOnly?: boolean }
): Set<string> {
  if (options?.openOnly === false) {
    return collectPaidProductionMonths(cycles, options.excludeCycleNumber);
  }

  const occupied = new Set<string>();

  for (const cycle of cycles) {
    if (options?.excludeCycleNumber === cycle.cycle_number) continue;
    if (!cycle.payment_id) continue;
    if (!OPEN_CYCLE_STATUSES.has(cycle.status as CycleStatus)) {
      continue;
    }

    const monthKey = resolveCycleProductionMonthKey(cycle);
    if (monthKey) occupied.add(monthKey);
  }

  return occupied;
}

function collectPaidProductionMonths(
  cycles: CycleMonthRow[],
  excludeCycleNumber?: number
): Set<string> {
  const occupied = new Set<string>();

  for (const cycle of cycles) {
    if (excludeCycleNumber === cycle.cycle_number) continue;
    if (!cycle.payment_id && !cycle.scheduled_production_month) continue;

    const monthKey = resolveCycleProductionMonthKey(cycle);
    if (monthKey) occupied.add(monthKey);
  }

  return occupied;
}

/**
 * Mês 1: mês de produção derivado do pagamento (ex.: jun → jul).
 * Mês 2+: nunca no mesmo mês de produção de um ciclo anterior — se jul já
 * estiver ocupado, renovação de jul vai para ago, e assim por diante.
 */
export function resolveSequentialProductionMonthKey(
  cycles: CycleMonthRow[],
  targetCycleNumber: number,
  paymentPaidAt: string,
  options?: { excludeCycleNumber?: number }
): string {
  const occupied = collectPaidProductionMonths(
    cycles,
    options?.excludeCycleNumber
  );

  let candidate = mapRawMonthToProductionMonth(
    monthKeyFromDate(new Date(paymentPaidAt))
  );

  if (targetCycleNumber > 1) {
    const previousCycle = cycles.find(
      (cycle) =>
        cycle.cycle_number === targetCycleNumber - 1 &&
        (cycle.payment_id || cycle.scheduled_production_month)
    );
    const previousMonth = previousCycle
      ? resolveCycleProductionMonthKey(previousCycle)
      : latestOccupiedProductionMonth(occupied);

    if (previousMonth) {
      const floor = addMonthsToMonthKey(previousMonth, 1);
      if (candidate < floor) candidate = floor;
    }
  }

  return bumpProductionMonthWhileOccupied(candidate, occupied);
}

export function resolveMonthlyProductionMonthKey(
  paymentPaidAt: string,
  occupied: Set<string>
): string {
  const rawMonth = monthKeyFromDate(new Date(paymentPaidAt));
  const candidate = mapRawMonthToProductionMonth(rawMonth);
  return bumpProductionMonthWhileOccupied(candidate, occupied);
}

/** @deprecated Prefer resolveSequentialProductionMonthKey */
export function resolveRenewalProductionMonthKey(
  paymentPaidAt: string,
  occupied: Set<string>
): string {
  if (occupied.size === 0) {
    return resolveMonthlyProductionMonthKey(paymentPaidAt, occupied);
  }

  const latestOccupied = Array.from(occupied).sort().at(-1)!;
  const minimumMonth = addMonthsToMonthKey(latestOccupied, 1);
  const paymentMonth = mapRawMonthToProductionMonth(
    monthKeyFromDate(new Date(paymentPaidAt))
  );
  const candidate = paymentMonth > minimumMonth ? paymentMonth : minimumMonth;
  return bumpProductionMonthWhileOccupied(candidate, occupied);
}

export function latestOccupiedProductionMonth(
  occupied: Set<string>
): string | null {
  if (occupied.size === 0) return null;
  return Array.from(occupied).sort().at(-1) ?? null;
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

  const maxPaidCycle = sorted.reduce((max, cycle) => {
    if (!cycle.payment_id) return max;
    return Math.max(max, cycle.cycle_number);
  }, 0);

  return maxPaidCycle + 1;
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
  const monthKey = resolveSequentialProductionMonthKey(
    cycles,
    targetCycleNumber,
    paymentPaidAt,
    { excludeCycleNumber: targetCycleNumber }
  );
  return `${monthKey}-01`;
}

export async function resolveRenewalTargetCycleNumberForSubscription(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<number> {
  const cycles = await loadSubscriptionCycleMonthRows(supabase, subscriptionId);
  return resolveRenewalTargetCycleNumber(cycles);
}

export async function loadApprovedBillingPayments(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<BillingPaymentRow[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount_cents, paid_at, created_at')
    .eq('subscription_id', subscriptionId)
    .eq('status', 'approved')
    .order('paid_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[monthly-production] load billing payments:', error.message);
    return [];
  }

  return prepareBillingCyclePayments((data ?? []) as BillingPaymentRow[]);
}

export async function countApprovedSubscriptionPayments(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<number> {
  const payments = await loadApprovedBillingPayments(supabase, subscriptionId);
  return payments.length;
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
  spuriousCyclesCleared: number;
}> {
  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('id, billing_term, loyalty_level')
    .in('status', ['active', 'past_due', 'cancelled']);

  if (error || !subs?.length) {
    return {
      monthsFixed: 0,
      loyaltyFixed: 0,
      renewalCyclesAttached: 0,
      spuriousCyclesCleared: 0,
    };
  }

  let monthsFixed = 0;
  let loyaltyFixed = 0;
  let renewalCyclesAttached = 0;
  let spuriousCyclesCleared = 0;
  const now = new Date().toISOString();

  for (const sub of subs) {
    const billingTerm = (sub.billing_term as BillingTerm | null) ?? 'monthly';
    if (isComboTerm(billingTerm)) continue;

    const subscriptionId = sub.id as string;

    const approvedPayments = await loadApprovedBillingPayments(
      supabase,
      subscriptionId
    );

    if (!approvedPayments.length) continue;

    let cycles = await loadSubscriptionCycleMonthRows(supabase, subscriptionId);

    for (let index = 0; index < approvedPayments.length; index += 1) {
      const payment = approvedPayments[index]!;
      const cycleNumber = index + 1;
      const paidAt =
        (payment.paid_at as string | null) ??
        (payment.created_at as string | null) ??
        now;
      const monthKey = resolveSequentialProductionMonthKey(
        cycles,
        cycleNumber,
        paidAt,
        { excludeCycleNumber: cycleNumber }
      );
      const scheduledProductionMonth = `${monthKey}-01`;

      const { data: existing } = await supabase
        .from('subscription_cycles')
        .select('payment_id, scheduled_production_month, status')
        .eq('subscription_id', subscriptionId)
        .eq('cycle_number', cycleNumber)
        .maybeSingle();

      const needsUpdate =
        existing?.payment_id !== payment.id ||
        existing?.scheduled_production_month !== scheduledProductionMonth;

      if (!needsUpdate) continue;

      const patch: Record<string, unknown> = {
        payment_id: payment.id,
        paid_at: paidAt,
        amount_cents: payment.amount_cents,
        scheduled_production_month: scheduledProductionMonth,
        updated_at: now,
      };

      if (!existing) {
        const { error: insertError } = await supabase
          .from('subscription_cycles')
          .insert({
            subscription_id: subscriptionId,
            cycle_number: cycleNumber,
            status: 'upcoming',
            ...patch,
          });

        if (!insertError) {
          monthsFixed += 1;
          if (index > 0) renewalCyclesAttached += 1;
          cycles.push({
            cycle_number: cycleNumber,
            status: 'upcoming',
            paid_at: paidAt,
            created_at: null,
            scheduled_production_month: scheduledProductionMonth,
            payment_id: payment.id,
          });
          cycles.sort((a, b) => a.cycle_number - b.cycle_number);
        }
        continue;
      }

      const { error: updateError } = await supabase
        .from('subscription_cycles')
        .update(patch)
        .eq('subscription_id', subscriptionId)
        .eq('cycle_number', cycleNumber);

      if (!updateError) {
        monthsFixed += 1;
        if (index > 0 && existing.payment_id !== payment.id) {
          renewalCyclesAttached += 1;
        }
      }

      const localIndex = cycles.findIndex(
        (cycle) => cycle.cycle_number === cycleNumber
      );
      const localRow: CycleMonthRow = {
        cycle_number: cycleNumber,
        status: (existing?.status as string | null) ?? 'upcoming',
        paid_at: paidAt,
        created_at: null,
        scheduled_production_month: scheduledProductionMonth,
        payment_id: payment.id,
      };
      if (localIndex >= 0) {
        cycles[localIndex] = { ...cycles[localIndex]!, ...localRow };
      } else {
        cycles.push(localRow);
        cycles.sort((a, b) => a.cycle_number - b.cycle_number);
      }
    }

    const billingPaymentCount = approvedPayments.length;
    const { data: strayCycles } = await supabase
      .from('subscription_cycles')
      .select('cycle_number, payment_id, scheduled_production_month')
      .eq('subscription_id', subscriptionId)
      .gt('cycle_number', billingPaymentCount);

    for (const stray of strayCycles ?? []) {
      if (
        !stray.payment_id &&
        !stray.scheduled_production_month
      ) {
        continue;
      }

      const { error: clearError } = await supabase
        .from('subscription_cycles')
        .update({
          payment_id: null,
          paid_at: null,
          amount_cents: null,
          scheduled_production_month: null,
          updated_at: now,
        })
        .eq('subscription_id', subscriptionId)
        .eq('cycle_number', stray.cycle_number as number);

      if (!clearError) spuriousCyclesCleared += 1;
    }

    const approvedPaymentCount = approvedPayments.length;
    const expectedLoyalty = loyaltyLevelFromApprovedPayments(approvedPaymentCount);
    const expectedCurrentCycle = approvedPaymentCount + 1;

    const { data: currentSub } = await supabase
      .from('subscriptions')
      .select('loyalty_level, current_cycle')
      .eq('id', subscriptionId)
      .maybeSingle();

    if (
      currentSub?.loyalty_level === expectedLoyalty &&
      currentSub?.current_cycle === expectedCurrentCycle
    ) {
      continue;
    }

    const { error: loyaltyError } = await supabase
      .from('subscriptions')
      .update({
        loyalty_level: expectedLoyalty,
        current_cycle: expectedCurrentCycle,
        updated_at: now,
      })
      .eq('id', subscriptionId);

    if (!loyaltyError) loyaltyFixed += 1;
  }

  return { monthsFixed, loyaltyFixed, renewalCyclesAttached, spuriousCyclesCleared };
}
