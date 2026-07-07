import type { SupabaseClient } from '@supabase/supabase-js';
import { monthKeyFromDate } from '@/lib/admin/chart-period';
import { mapRawMonthToProductionMonth } from '@/lib/admin/production-month';
import {
  isComboTerm,
  prepaidMonthsForTerm,
  type BillingTerm,
} from '@/lib/checkout/combo-billing';
import { isComboPrepaidPayment } from '@/lib/payments/effective-amount';
import { findCanonicalComboPrepaidPayment } from '@/lib/payments/combo-payment-queries';
import {
  ensureSubscriptionCycle,
  markCyclePreparing,
} from '@/lib/subscriptions/cycles';

interface CyclePaymentLink {
  id: string;
  amount_cents: number | null;
  paid_at: string | null;
}

export function resolveCycleScheduledMonthKey(input: {
  scheduled_production_month?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
}): string | null {
  if (input.scheduled_production_month) {
    return input.scheduled_production_month.slice(0, 7);
  }
  const fallback = input.paid_at ?? input.created_at;
  return fallback ? fallback.slice(0, 7) : null;
}

/** Mês de produção do ciclo 1 a partir da data de pagamento. */
export function comboProductionAnchorFromPayment(
  paidAt: Date | string
): Date {
  const date = typeof paidAt === 'string' ? new Date(paidAt) : paidAt;
  const productionKey = mapRawMonthToProductionMonth(monthKeyFromDate(date));
  const [year, month] = productionKey.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

export function scheduledProductionMonthForComboCycle(
  anchor: Date,
  cycleNumber: number
): string {
  const monthIndex = anchor.getMonth() + (cycleNumber - 1);
  const date = new Date(anchor.getFullYear(), monthIndex, 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

async function upsertScheduledComboCycle(
  supabase: SupabaseClient,
  input: {
    subscriptionId: string;
    cycleNumber: number;
    scheduledMonth: string;
    paymentLink: CyclePaymentLink;
    activateNow: boolean;
    resyncOnly?: boolean;
  }
): Promise<void> {
  await ensureSubscriptionCycle(supabase, input.subscriptionId, input.cycleNumber);

  const { data: existing } = await supabase
    .from('subscription_cycles')
    .select('status')
    .eq('subscription_id', input.subscriptionId)
    .eq('cycle_number', input.cycleNumber)
    .maybeSingle();

  const lockedStatus = existing?.status as string | undefined;
  if (
    lockedStatus &&
    lockedStatus !== 'upcoming' &&
    lockedStatus !== 'failed' &&
    lockedStatus !== 'cancelled'
  ) {
    const { error } = await supabase
      .from('subscription_cycles')
      .update({
        scheduled_production_month: input.scheduledMonth,
        updated_at: new Date().toISOString(),
      })
      .eq('subscription_id', input.subscriptionId)
      .eq('cycle_number', input.cycleNumber);

    if (error) {
      console.error('[combo] upsertScheduledComboCycle locked:', error.message);
    }
    return;
  }

  if (input.activateNow && !input.resyncOnly) {
    await markCyclePreparing(
      supabase,
      input.subscriptionId,
      input.cycleNumber,
      input.paymentLink
    );
    const { error } = await supabase
      .from('subscription_cycles')
      .update({
        scheduled_production_month: input.scheduledMonth,
        updated_at: new Date().toISOString(),
      })
      .eq('subscription_id', input.subscriptionId)
      .eq('cycle_number', input.cycleNumber);

    if (error) {
      console.error('[combo] upsertScheduledComboCycle active:', error.message);
    }
    return;
  }

  if (input.activateNow && input.resyncOnly) {
    const { error } = await supabase
      .from('subscription_cycles')
      .update({
        scheduled_production_month: input.scheduledMonth,
        updated_at: new Date().toISOString(),
      })
      .eq('subscription_id', input.subscriptionId)
      .eq('cycle_number', input.cycleNumber);

    if (error) {
      console.error('[combo] upsertScheduledComboCycle resync:', error.message);
    }
    return;
  }

  const { error } = await supabase
    .from('subscription_cycles')
    .update({
      scheduled_production_month: input.scheduledMonth,
      payment_id: input.paymentLink.id,
      status: 'upcoming',
      paid_at: null,
      amount_cents: null,
      updated_at: new Date().toISOString(),
    })
    .eq('subscription_id', input.subscriptionId)
    .eq('cycle_number', input.cycleNumber);

  if (error) {
    console.error('[combo] upsertScheduledComboCycle future:', error.message);
  }
}

/** Cria ou corrige todos os ciclos do combo (1 kit por mês de produção). */
export async function seedPrepaidComboProductionSchedule(
  supabase: SupabaseClient,
  input: {
    subscriptionId: string;
    billingTerm: BillingTerm;
    paymentLink: CyclePaymentLink;
    anchorDate?: Date;
    resyncOnly?: boolean;
  }
): Promise<number> {
  if (!isComboTerm(input.billingTerm)) return 0;

  const totalMonths = prepaidMonthsForTerm(input.billingTerm);
  if (!totalMonths || totalMonths < 1) return 0;

  const anchor = input.anchorDate
    ? comboProductionAnchorFromPayment(input.anchorDate)
    : input.paymentLink.paid_at
      ? comboProductionAnchorFromPayment(input.paymentLink.paid_at)
      : comboProductionAnchorFromPayment(new Date());

  for (let cycleNumber = 1; cycleNumber <= totalMonths; cycleNumber += 1) {
    await upsertScheduledComboCycle(supabase, {
      subscriptionId: input.subscriptionId,
      cycleNumber,
      scheduledMonth: scheduledProductionMonthForComboCycle(anchor, cycleNumber),
      paymentLink: input.paymentLink,
      activateNow: cycleNumber === 1,
      resyncOnly: input.resyncOnly,
    });
  }

  return totalMonths;
}

/** Garante ciclos futuros e corrige meses de produção de combos existentes. */
export async function backfillPrepaidComboProductionSchedules(
  supabase: SupabaseClient
): Promise<{ subscriptions: number; cyclesCreated: number }> {
  const { data: subscriptions, error } = await supabase
    .from('subscriptions')
    .select('id, billing_term, started_at, status')
    .in('billing_term', ['combo_3', 'combo_6', 'combo_12'])
    .in('status', ['active', 'past_due']);

  if (error || !subscriptions?.length) {
    return { subscriptions: 0, cyclesCreated: 0 };
  }

  let subscriptionsTouched = 0;
  let cyclesCreated = 0;

  for (const subscription of subscriptions) {
    const billingTerm = subscription.billing_term as BillingTerm;
    if (!isComboTerm(billingTerm)) continue;

    const totalMonths = prepaidMonthsForTerm(billingTerm);
    if (!totalMonths) continue;

    const comboPayment = await findCanonicalComboPrepaidPayment(
      supabase,
      subscription.id as string
    );

    if (!comboPayment || !isComboPrepaidPayment(comboPayment.status_detail as string)) {
      continue;
    }

    const paymentLink: CyclePaymentLink = {
      id: comboPayment.id as string,
      amount_cents: comboPayment.amount_cents as number,
      paid_at: (comboPayment.paid_at as string | null) ?? null,
    };

    const anchor = paymentLink.paid_at
      ? new Date(paymentLink.paid_at)
      : subscription.started_at
        ? new Date(subscription.started_at as string)
        : new Date();

    const { count: beforeCount } = await supabase
      .from('subscription_cycles')
      .select('id', { count: 'exact', head: true })
      .eq('subscription_id', subscription.id as string);

    await seedPrepaidComboProductionSchedule(supabase, {
      subscriptionId: subscription.id as string,
      billingTerm,
      paymentLink,
      anchorDate: anchor,
      resyncOnly: (beforeCount ?? 0) > 0,
    });

    const { count: afterCount } = await supabase
      .from('subscription_cycles')
      .select('id', { count: 'exact', head: true })
      .eq('subscription_id', subscription.id as string);

    const created = Math.max(0, (afterCount ?? 0) - (beforeCount ?? 0));
    subscriptionsTouched += 1;
    cyclesCreated += created;
  }

  return { subscriptions: subscriptionsTouched, cyclesCreated };
}
