import type { SupabaseClient } from '@supabase/supabase-js';
import { monthKeyFromDate } from '@/lib/admin/chart-period';
import { mapRawMonthToProductionMonth } from '@/lib/admin/production-month';
import { isComboTerm, type BillingTerm } from '@/lib/checkout/combo-billing';
import type { CycleStatus } from '@/lib/dashboard/types';
import { calculateLoyaltyLevel } from '@/lib/subscriptions/loyalty';
import { resolveCycleScheduledMonthKey } from '@/lib/subscriptions/combo-production-schedule';
import {
  isExtraStoreKitPayment,
  prepareBillingCyclePayments,
  sortBillingPayments,
  type BillingPaymentRow,
} from '@/lib/subscriptions/billing-cycle-payments';
import { restoreCorruptedPaymentPaidAt } from '@/lib/subscriptions/payment-cycle-link';

const OPEN_CYCLE_STATUSES = new Set<CycleStatus>([
  'upcoming',
  'production',
  'preparing',
  'packed',
  'awaiting_pickup',
  'shipped',
]);

const PROTECTED_CYCLE_STATUSES = new Set([
  'production',
  'preparing',
  'packed',
  'awaiting_pickup',
  'shipped',
  'delivered',
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
 * Mês de produção a partir do pagamento: tenta o mês do pagamento; se o cliente
 * já tiver outro pedido em aberto (aguardando → enviado) nesse mês, avança até
 * achar um mês livre. Considera todos os ciclos da assinatura e de outras
 * assinaturas do mesmo usuário.
 */
export function resolveSequentialProductionMonthKey(
  cycles: CycleMonthRow[],
  _targetCycleNumber: number,
  paymentPaidAt: string,
  options?: {
    excludeCycleNumber?: number;
    userOccupiedMonths?: Set<string>;
  }
): string {
  const occupied = collectOccupiedProductionMonths(cycles, {
    excludeCycleNumber: options?.excludeCycleNumber,
    openOnly: true,
  });

  if (options?.userOccupiedMonths) {
    for (const monthKey of Array.from(options.userOccupiedMonths)) {
      occupied.add(monthKey);
    }
  }

  const candidate = mapRawMonthToProductionMonth(
    monthKeyFromDate(new Date(paymentPaidAt))
  );

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
  return resolveMonthlyProductionMonthKey(paymentPaidAt, occupied);
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

/** Meses de produção ocupados por outras assinaturas do mesmo cliente. */
export async function loadUserOccupiedProductionMonths(
  supabase: SupabaseClient,
  userId: string,
  options?: { excludeSubscriptionId?: string }
): Promise<Set<string>> {
  const { data: subs, error: subsError } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId);

  if (subsError || !subs?.length) return new Set();

  const subscriptionIds = subs
    .map((row) => row.id as string)
    .filter((id) => id !== options?.excludeSubscriptionId);

  if (subscriptionIds.length === 0) return new Set();

  const { data: cycles, error } = await supabase
    .from('subscription_cycles')
    .select(
      'cycle_number, status, paid_at, created_at, scheduled_production_month, payment_id'
    )
    .in('subscription_id', subscriptionIds);

  if (error || !cycles?.length) return new Set();

  return collectOccupiedProductionMonths(cycles as CycleMonthRow[]);
}

export async function resolveMonthlyScheduledProductionMonth(
  supabase: SupabaseClient,
  subscriptionId: string,
  paymentPaidAt: string,
  targetCycleNumber: number
): Promise<string> {
  const cycles = await loadSubscriptionCycleMonthRows(supabase, subscriptionId);

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('id', subscriptionId)
    .maybeSingle();

  const userOccupied = subscription?.user_id
    ? await loadUserOccupiedProductionMonths(
        supabase,
        subscription.user_id as string,
        { excludeSubscriptionId: subscriptionId }
      )
    : new Set<string>();

  const monthKey = resolveSequentialProductionMonthKey(
    cycles,
    targetCycleNumber,
    paymentPaidAt,
    {
      excludeCycleNumber: targetCycleNumber,
      userOccupiedMonths: userOccupied,
    }
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
    .select('id, amount_cents, paid_at, created_at, status_detail')
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

export async function unlinkStoreOrderPaymentsFromUpcomingCycles(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<number> {
  const { data: rows, error } = await supabase
    .from('subscription_cycles')
    .select('id, status, payment_id')
    .eq('subscription_id', subscriptionId)
    .not('payment_id', 'is', null);

  if (error || !rows?.length) return 0;

  const paymentIds = [
    ...new Set(
      rows
        .map((row) => row.payment_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  if (paymentIds.length === 0) return 0;

  const { data: approvedForEarliest } = await supabase
    .from('payments')
    .select('id, amount_cents, paid_at, created_at, status_detail')
    .eq('subscription_id', subscriptionId)
    .eq('status', 'approved');

  const earliestId =
    sortBillingPayments((approvedForEarliest ?? []) as BillingPaymentRow[])[0]
      ?.id ?? null;

  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount_cents, paid_at, created_at, status_detail')
    .in('id', paymentIds);

  const extraPaymentIds = new Set(
    (payments ?? [])
      .filter((payment) =>
        isExtraStoreKitPayment(
          {
            id: payment.id as string,
            amount_cents: payment.amount_cents as number | null,
            paid_at: payment.paid_at as string | null,
            created_at: payment.created_at as string | null,
            status_detail: payment.status_detail as string | null,
          },
          earliestId
        )
      )
      .map((payment) => payment.id as string)
  );

  let cleared = 0;
  const now = new Date().toISOString();

  for (const row of rows) {
    if (PROTECTED_CYCLE_STATUSES.has(row.status as string)) continue;
    if (!extraPaymentIds.has(row.payment_id as string)) continue;

    const { error: clearError } = await supabase
      .from('subscription_cycles')
      .update({
        payment_id: null,
        paid_at: null,
        amount_cents: null,
        scheduled_production_month: null,
        updated_at: now,
      })
      .eq('id', row.id as string);

    if (!clearError) cleared += 1;
  }

  return cleared;
}

/** Corrige meses de produção e fidelidade de uma assinatura mensal. */
export async function repairMonthlyProductionForSubscription(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<{
  monthsFixed: number;
  loyaltyFixed: number;
  renewalCyclesAttached: number;
  spuriousCyclesCleared: number;
  paidAtRestored: number;
  skipped?: 'not_found' | 'combo' | 'no_payments';
}> {
  const empty = {
    monthsFixed: 0,
    loyaltyFixed: 0,
    renewalCyclesAttached: 0,
    spuriousCyclesCleared: 0,
    paidAtRestored: 0,
  };

  const { data: sub, error } = await supabase
    .from('subscriptions')
    .select('id, billing_term, loyalty_level, status, user_id')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (error || !sub) {
    return { ...empty, skipped: 'not_found' as const };
  }

  const billingTerm = (sub.billing_term as BillingTerm | null) ?? 'monthly';
  if (isComboTerm(billingTerm)) {
    return { ...empty, skipped: 'combo' as const };
  }

  const approvedPayments = await loadApprovedBillingPayments(
    supabase,
    subscriptionId
  );

  if (!approvedPayments.length) {
    return { ...empty, skipped: 'no_payments' as const };
  }

  const paidAtRestored = await restoreCorruptedPaymentPaidAt(
    supabase,
    subscriptionId
  );
  if (paidAtRestored > 0) {
    approvedPayments.splice(
      0,
      approvedPayments.length,
      ...(await loadApprovedBillingPayments(supabase, subscriptionId))
    );
  }

  const storeLinksCleared = await unlinkStoreOrderPaymentsFromUpcomingCycles(
    supabase,
    subscriptionId
  );

  let monthsFixed = 0;
  let loyaltyFixed = 0;
  let renewalCyclesAttached = 0;
  let spuriousCyclesCleared = storeLinksCleared;
  const now = new Date().toISOString();

  let cycles = await loadSubscriptionCycleMonthRows(supabase, subscriptionId);
  const userOccupied = sub.user_id
    ? await loadUserOccupiedProductionMonths(
        supabase,
        sub.user_id as string,
        { excludeSubscriptionId: subscriptionId }
      )
    : new Set<string>();

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
      {
        excludeCycleNumber: cycleNumber,
        userOccupiedMonths: userOccupied,
      }
    );
    const scheduledProductionMonth = `${monthKey}-01`;

    const { data: existing } = await supabase
      .from('subscription_cycles')
      .select('payment_id, scheduled_production_month, status')
      .eq('subscription_id', subscriptionId)
      .eq('cycle_number', cycleNumber)
      .maybeSingle();

    if (existing && PROTECTED_CYCLE_STATUSES.has(existing.status as string)) {
      if (!existing.scheduled_production_month) {
        const { error: pinError } = await supabase
          .from('subscription_cycles')
          .update({
            scheduled_production_month: scheduledProductionMonth,
            updated_at: now,
          })
          .eq('subscription_id', subscriptionId)
          .eq('cycle_number', cycleNumber);

        if (!pinError) {
          monthsFixed += 1;
          const localIndex = cycles.findIndex(
            (cycle) => cycle.cycle_number === cycleNumber
          );
          if (localIndex >= 0) {
            cycles[localIndex] = {
              ...cycles[localIndex]!,
              scheduled_production_month: scheduledProductionMonth,
            };
          }
        }
      }
      continue;
    }

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
  const billingPaymentIds = new Set(approvedPayments.map((payment) => payment.id));

  const { data: cycleRowsAfterAssign } = await supabase
    .from('subscription_cycles')
    .select('id, cycle_number, payment_id, scheduled_production_month, status')
    .eq('subscription_id', subscriptionId)
    .order('cycle_number', { ascending: true });

  const cyclesByPayment = new Map<string, typeof cycleRowsAfterAssign>();
  for (const row of cycleRowsAfterAssign ?? []) {
    const paymentId = row.payment_id as string | null;
    if (!paymentId || !billingPaymentIds.has(paymentId)) continue;
    const list = cyclesByPayment.get(paymentId) ?? [];
    list.push(row);
    cyclesByPayment.set(paymentId, list);
  }

  for (const duplicates of cyclesByPayment.values()) {
    if (!duplicates || duplicates.length < 2) continue;
    const [, ...extras] = duplicates;
    for (const extra of extras) {
      if (PROTECTED_CYCLE_STATUSES.has(extra.status as string)) continue;
      if (extra.status === 'upcoming') {
        const { error: deleteError } = await supabase
          .from('subscription_cycles')
          .delete()
          .eq('id', extra.id as string);
        if (!deleteError) spuriousCyclesCleared += 1;
      }
    }
  }

  const { data: cycleRows } = await supabase
    .from('subscription_cycles')
    .select('id, cycle_number, payment_id, scheduled_production_month, status')
    .eq('subscription_id', subscriptionId);

  const maxBillingCycle = (cycleRows ?? []).reduce((max, row) => {
    if (!row.payment_id || !billingPaymentIds.has(row.payment_id as string)) {
      return max;
    }
    return Math.max(max, row.cycle_number as number);
  }, 0);
  const expectedCurrentCycle = Math.max(1, billingPaymentCount, maxBillingCycle);

  const strayCycles = (cycleRows ?? []).filter(
    (row) => (row.cycle_number as number) > expectedCurrentCycle
  );

  for (const stray of strayCycles) {
    const cycleNumber = stray.cycle_number as number;
    if (PROTECTED_CYCLE_STATUSES.has(stray.status as string)) continue;
    if (
      stray.payment_id &&
      billingPaymentIds.has(stray.payment_id as string)
    ) {
      continue;
    }

    if (stray.status === 'upcoming') {
      const { error: deleteError } = await supabase
        .from('subscription_cycles')
        .delete()
        .eq('id', stray.id as string);
      if (!deleteError) spuriousCyclesCleared += 1;
      continue;
    }

    if (!stray.payment_id && !stray.scheduled_production_month) {
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
      .eq('cycle_number', cycleNumber);

    if (!clearError) spuriousCyclesCleared += 1;
  }

  const approvedPaymentCount = approvedPayments.length;
  const expectedLoyalty = loyaltyLevelFromApprovedPayments(approvedPaymentCount);

  const lastPayment = approvedPayments[approvedPayments.length - 1]!;
  const lastPaidAt =
    (lastPayment.paid_at as string | null) ??
    (lastPayment.created_at as string | null) ??
    now;
  const nextBillingDate = new Date(lastPaidAt);
  nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select(
      'loyalty_level, current_cycle, next_billing_date, pagarme_subscription_id, asaas_subscription_id'
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  const subscriptionPatch: Record<string, unknown> = {
    updated_at: now,
  };
  let shouldUpdateSubscription = false;

  if (currentSub?.loyalty_level !== expectedLoyalty) {
    subscriptionPatch.loyalty_level = expectedLoyalty;
    shouldUpdateSubscription = true;
  }
  if (currentSub?.current_cycle !== expectedCurrentCycle) {
    subscriptionPatch.current_cycle = expectedCurrentCycle;
    shouldUpdateSubscription = true;
  }

  const hasGatewaySubscription = Boolean(
    currentSub?.pagarme_subscription_id || currentSub?.asaas_subscription_id
  );
  if (
    !hasGatewaySubscription &&
    currentSub?.next_billing_date !== nextBillingDate.toISOString()
  ) {
    subscriptionPatch.next_billing_date = nextBillingDate.toISOString();
    subscriptionPatch.current_period_end = nextBillingDate.toISOString();
    shouldUpdateSubscription = true;
  }

  if (shouldUpdateSubscription) {
    const { error: loyaltyError } = await supabase
      .from('subscriptions')
      .update(subscriptionPatch)
      .eq('id', subscriptionId);

    if (!loyaltyError) loyaltyFixed += 1;
  }

  return {
    monthsFixed,
    loyaltyFixed,
    renewalCyclesAttached,
    spuriousCyclesCleared,
    paidAtRestored,
  };
}

/** Corrige meses de produção e fidelidade em assinaturas mensais já afetadas. */
export async function repairMonthlyProductionMonthsAndLoyalty(
  supabase: SupabaseClient,
  options?: { subscriptionId?: string }
): Promise<{
  monthsFixed: number;
  loyaltyFixed: number;
  renewalCyclesAttached: number;
  spuriousCyclesCleared: number;
  paidAtRestored: number;
}> {
  let query = supabase
    .from('subscriptions')
    .select('id, billing_term, loyalty_level')
    .in('status', ['active', 'past_due', 'cancelled']);

  if (options?.subscriptionId) {
    query = query.eq('id', options.subscriptionId);
  }

  const { data: subs, error } = await query;

  if (error || !subs?.length) {
    return {
      monthsFixed: 0,
      loyaltyFixed: 0,
      renewalCyclesAttached: 0,
      spuriousCyclesCleared: 0,
      paidAtRestored: 0,
    };
  }

  let monthsFixed = 0;
  let loyaltyFixed = 0;
  let renewalCyclesAttached = 0;
  let spuriousCyclesCleared = 0;
  let paidAtRestored = 0;

  for (const sub of subs) {
    const result = await repairMonthlyProductionForSubscription(
      supabase,
      sub.id as string
    );
    if (result.skipped) continue;
    monthsFixed += result.monthsFixed;
    loyaltyFixed += result.loyaltyFixed;
    renewalCyclesAttached += result.renewalCyclesAttached;
    spuriousCyclesCleared += result.spuriousCyclesCleared;
    paidAtRestored += result.paidAtRestored;
  }

  return {
    monthsFixed,
    loyaltyFixed,
    renewalCyclesAttached,
    spuriousCyclesCleared,
    paidAtRestored,
  };
}
