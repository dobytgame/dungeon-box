import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveSubscriptionMonthlyRevenueCents } from '@/lib/admin/subscription-monthly-revenue';
import { isComboTerm, type BillingTerm } from '@/lib/checkout/combo-billing';
import { isComboSubscription } from '@/lib/payments/revenue-aggregation';

export type RecurringMrrSubscriptionRow = {
  billing_term?: string | null;
  combo_total_cents?: number | null;
  prepaid_months?: number | null;
  prepaid_until?: string | null;
  shipping_cents?: number | null;
  special_notes?: string | null;
  plans:
    | { price_cents: number | null }
    | { price_cents: number | null }[]
    | null;
};

/** Combos e pré-pago são venda única — não entram no MRR recorrente. */
export function isRecurringMrrSubscription(
  row: RecurringMrrSubscriptionRow
): boolean {
  if (isComboSubscription(row)) return false;

  if (row.billing_term && isComboTerm(row.billing_term as BillingTerm)) {
    return false;
  }

  if (row.prepaid_until) {
    const prepaidUntil = new Date(row.prepaid_until);
    if (!Number.isNaN(prepaidUntil.getTime()) && prepaidUntil > new Date()) {
      return false;
    }
  }

  return true;
}

export function recurringMrrCentsForSubscription(
  row: RecurringMrrSubscriptionRow
): number {
  const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
  return (
    resolveSubscriptionMonthlyRevenueCents({
      planPriceCents: plan?.price_cents ?? null,
      shippingCents: row.shipping_cents,
      specialNotes: row.special_notes,
    }) ?? 0
  );
}

export function summarizeRecurringMrr(rows: RecurringMrrSubscriptionRow[]): {
  recurringMrrCents: number;
  recurringSubscribers: number;
  comboActiveCount: number;
} {
  let recurringMrrCents = 0;
  let recurringSubscribers = 0;
  let comboActiveCount = 0;

  for (const row of rows) {
    if (!isRecurringMrrSubscription(row)) {
      comboActiveCount += 1;
      continue;
    }
    recurringSubscribers += 1;
    recurringMrrCents += recurringMrrCentsForSubscription(row);
  }

  return { recurringMrrCents, recurringSubscribers, comboActiveCount };
}

export async function getRecurringMrrSummary(
  admin: SupabaseClient
): Promise<{
  recurringMrrCents: number;
  recurringSubscribers: number;
  comboActiveCount: number;
}> {
  const { data, error } = await admin
    .from('subscriptions')
    .select(
      `
      billing_term,
      combo_total_cents,
      prepaid_months,
      prepaid_until,
      shipping_cents,
      special_notes,
      plans!plan_id(price_cents)
    `
    )
    .eq('status', 'active');

  if (error) {
    console.error('[admin] getRecurringMrrSummary:', error.message);
    return {
      recurringMrrCents: 0,
      recurringSubscribers: 0,
      comboActiveCount: 0,
    };
  }

  return summarizeRecurringMrr((data ?? []) as RecurringMrrSubscriptionRow[]);
}
