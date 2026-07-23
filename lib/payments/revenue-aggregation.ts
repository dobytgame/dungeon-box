import type { BillingTerm } from '@/lib/checkout/combo-billing';
import { isComboTerm } from '@/lib/checkout/combo-billing';
import { parseStoreOrderMeta } from '@/lib/asaas/store-order-payment';
import {
  isComboPrepaidPayment,
  isComboInstallmentSlicePayment,
  resolveEffectivePaymentAmountCents,
} from '@/lib/payments/effective-amount';

export type RevenuePaymentRow = {
  id: string;
  subscription_id: string | null;
  amount_cents: number;
  status_detail: string | null;
  installments?: number | null;
  paid_at?: string | null;
  created_at?: string | null;
  subscriptions?: unknown;
};

export type SubscriptionRevenueContext = {
  billing_term?: string | null;
  combo_total_cents?: number | null;
  combo_installments?: number | null;
  prepaid_months?: number | null;
  prepaid_until?: string | null;
};

function getSubscription(row: RevenuePaymentRow): SubscriptionRevenueContext | null {
  const subscription = Array.isArray(row.subscriptions)
    ? row.subscriptions[0]
    : row.subscriptions;
  return (subscription as SubscriptionRevenueContext | null) ?? null;
}

function paymentDayKey(row: RevenuePaymentRow | null | undefined): string | null {
  if (!row) return null;
  const raw = row.paid_at ?? row.created_at;
  return raw ? raw.slice(0, 10) : null;
}

function sortPaymentsChronologically(
  rows: RevenuePaymentRow[]
): RevenuePaymentRow[] {
  return [...rows].sort((a, b) => {
    const aTime = a.paid_at ?? a.created_at ?? '';
    const bTime = b.paid_at ?? b.created_at ?? '';
    const cmp = aTime.localeCompare(bTime);
    if (cmp !== 0) return cmp;
    return a.id.localeCompare(b.id);
  });
}

/** Assinatura combo/pré-paga: receita entra só na compra, não mês a mês. */
export function isComboSubscription(
  subscription: SubscriptionRevenueContext | null | undefined
): boolean {
  if (!subscription) return false;

  const billingTerm = subscription.billing_term;
  if (billingTerm && isComboTerm(billingTerm as BillingTerm)) {
    return true;
  }

  if ((subscription.combo_total_cents ?? 0) > 0) {
    return true;
  }

  if ((subscription.prepaid_months ?? 0) > 0) {
    return true;
  }

  return false;
}

function isInstallmentSliceRow(
  row: RevenuePaymentRow,
  subscription: SubscriptionRevenueContext | null
): boolean {
  return isComboInstallmentSlicePayment(
    {
      amount_cents: row.amount_cents,
      status_detail: row.status_detail,
      installments: row.installments ?? null,
    },
    subscription
  );
}

/** Primeiro pagamento combo (pré-pago ou compra única) aprovado por assinatura. */
export function buildCanonicalComboPrepaidIndex(
  rows: RevenuePaymentRow[]
): Map<string, string> {
  const bySubscription = new Map<string, string>();

  const prepaidRows = sortPaymentsChronologically(
    rows.filter(
      (row) => row.subscription_id && isComboPrepaidPayment(row.status_detail)
    )
  );

  for (const row of prepaidRows) {
    if (!row.subscription_id || bySubscription.has(row.subscription_id)) continue;
    bySubscription.set(row.subscription_id, row.id);
  }

  const comboSubRows = sortPaymentsChronologically(
    rows.filter((row) => {
      if (!row.subscription_id || bySubscription.has(row.subscription_id)) {
        return false;
      }

      const subscription = getSubscription(row);
      if (!isComboSubscription(subscription)) return false;

      return !isInstallmentSliceRow(row, subscription);
    })
  );

  for (const row of comboSubRows) {
    if (!row.subscription_id || bySubscription.has(row.subscription_id)) continue;
    bySubscription.set(row.subscription_id, row.id);
  }

  return bySubscription;
}

export function buildComboPrepaidDayBySubscription(
  rows: RevenuePaymentRow[],
  canonicalComboBySubscription: Map<string, string>
): Map<string, string> {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const days = new Map<string, string>();

  for (const [subscriptionId, paymentId] of Array.from(
    canonicalComboBySubscription.entries()
  )) {
    const day = paymentDayKey(byId.get(paymentId) ?? null);
    if (day) days.set(subscriptionId, day);
  }

  return days;
}

export function shouldCountPaymentInRevenue(
  row: RevenuePaymentRow,
  canonicalComboBySubscription: Map<string, string>,
  _comboPrepaidDayBySubscription: Map<string, string>
): boolean {
  if (parseStoreOrderMeta(row.status_detail)) {
    return true;
  }

  const subscriptionId = row.subscription_id;
  const subscription = getSubscription(row);

  if (isInstallmentSliceRow(row, subscription)) {
    return false;
  }

  if (subscriptionId && isComboSubscription(subscription)) {
    const canonicalId = canonicalComboBySubscription.get(subscriptionId);
    if (canonicalId) {
      return row.id === canonicalId;
    }

    if (isComboPrepaidPayment(row.status_detail)) {
      return true;
    }

    return false;
  }

  if (isComboPrepaidPayment(row.status_detail) && subscriptionId) {
    return canonicalComboBySubscription.get(subscriptionId) === row.id;
  }

  return true;
}

export function resolvePaymentRevenueCents(row: RevenuePaymentRow): number {
  return resolveEffectivePaymentAmountCents(
    {
      amount_cents: row.amount_cents,
      status_detail: row.status_detail,
      installments: row.installments ?? null,
    },
    getSubscription(row)
  );
}

export function sumPaymentRevenueCents(rows: RevenuePaymentRow[]): number {
  const canonicalComboBySubscription = buildCanonicalComboPrepaidIndex(rows);
  const comboPrepaidDayBySubscription = buildComboPrepaidDayBySubscription(
    rows,
    canonicalComboBySubscription
  );

  return rows.reduce((sum, row) => {
    if (
      !shouldCountPaymentInRevenue(
        row,
        canonicalComboBySubscription,
        comboPrepaidDayBySubscription
      )
    ) {
      return sum;
    }
    return sum + resolvePaymentRevenueCents(row);
  }, 0);
}
