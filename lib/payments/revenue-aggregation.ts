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
  started_at?: string | null;
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

function subscriptionMonthKey(
  subscriptionId: string,
  row: RevenuePaymentRow
): string | null {
  const day = paymentDayKey(row);
  if (!day) return null;
  return `${subscriptionId}:${day.slice(0, 7)}`;
}

/** Uma cobrança por assinatura/mês (evita duplicata de import Asaas). */
export function buildCanonicalMonthlyPaymentIndex(
  rows: RevenuePaymentRow[],
  canonicalComboBySubscription: Map<string, string>
): Map<string, string> {
  const byMonth = new Map<string, string>();

  const monthlyRows = sortPaymentsChronologically(
    rows.filter((row) => {
      if (!row.subscription_id) return false;

      const subscription = getSubscription(row);
      if (isComboSubscription(subscription)) return false;
      if (isComboPrepaidPayment(row.status_detail)) return false;
      if (isInstallmentSliceRow(row, subscription)) return false;

      const canonicalComboId = canonicalComboBySubscription.get(row.subscription_id);
      if (canonicalComboId && canonicalComboId !== row.id) return false;

      return Boolean(paymentDayKey(row));
    })
  );

  for (const row of monthlyRows) {
    const monthKey = subscriptionMonthKey(row.subscription_id!, row);
    if (!monthKey || byMonth.has(monthKey)) continue;
    byMonth.set(monthKey, row.id);
  }

  return byMonth;
}

function paymentTimestamp(row: RevenuePaymentRow): string {
  return row.paid_at ?? row.created_at ?? '';
}

/** Primeira cobrança real da assinatura (aquisição — não renovação mensal). */
export function buildFirstSubscriptionPaymentIndex(
  rows: RevenuePaymentRow[],
  canonicalComboBySubscription: Map<string, string>
): Map<string, string> {
  const bySubscription = new Map<string, string>();

  for (const [subscriptionId, paymentId] of Array.from(
    canonicalComboBySubscription.entries()
  )) {
    bySubscription.set(subscriptionId, paymentId);
  }

  const sorted = sortPaymentsChronologically(
    rows.filter((row) => {
      if (!row.subscription_id || bySubscription.has(row.subscription_id)) {
        return false;
      }

      const subscription = getSubscription(row);
      if (isInstallmentSliceRow(row, subscription)) return false;

      return Boolean(paymentTimestamp(row));
    })
  );

  for (const row of sorted) {
    if (!row.subscription_id || bySubscription.has(row.subscription_id)) continue;
    bySubscription.set(row.subscription_id, row.id);
  }

  return bySubscription;
}

function isPaymentBeforeSubscriptionStart(
  subscription: SubscriptionRevenueContext | null,
  row: RevenuePaymentRow
): boolean {
  const startedAt = subscription?.started_at;
  const paidAt = row.paid_at ?? row.created_at;
  if (!startedAt || !paidAt) return false;

  const started = new Date(startedAt);
  const paid = new Date(paidAt);
  if (Number.isNaN(started.getTime()) || Number.isNaN(paid.getTime())) {
    return false;
  }

  const graceMs = 3 * 24 * 60 * 60 * 1000;
  return paid.getTime() < started.getTime() - graceMs;
}

function isPaymentCoveredByPrepaid(
  subscription: SubscriptionRevenueContext | null,
  row: RevenuePaymentRow,
  firstPaymentBySubscription: Map<string, string>
): boolean {
  if (!subscription?.prepaid_until || !row.subscription_id) return false;

  const prepaidUntil = new Date(subscription.prepaid_until);
  const paidAt = row.paid_at ?? row.created_at;
  if (!paidAt || Number.isNaN(prepaidUntil.getTime())) return false;

  if (new Date(paidAt).getTime() > prepaidUntil.getTime()) return false;

  const firstId = firstPaymentBySubscription.get(row.subscription_id);
  return Boolean(firstId && row.id !== firstId);
}

export function buildRevenueCountIndexes(rows: RevenuePaymentRow[]): {
  canonicalComboBySubscription: Map<string, string>;
  comboPrepaidDayBySubscription: Map<string, string>;
  canonicalMonthlyBySubscriptionMonth: Map<string, string>;
  firstPaymentBySubscription: Map<string, string>;
} {
  const canonicalComboBySubscription = buildCanonicalComboPrepaidIndex(rows);
  const comboPrepaidDayBySubscription = buildComboPrepaidDayBySubscription(
    rows,
    canonicalComboBySubscription
  );
  const canonicalMonthlyBySubscriptionMonth = buildCanonicalMonthlyPaymentIndex(
    rows,
    canonicalComboBySubscription
  );
  const firstPaymentBySubscription = buildFirstSubscriptionPaymentIndex(
    rows,
    canonicalComboBySubscription
  );

  return {
    canonicalComboBySubscription,
    comboPrepaidDayBySubscription,
    canonicalMonthlyBySubscriptionMonth,
    firstPaymentBySubscription,
  };
}

export function shouldCountPaymentInRevenue(
  row: RevenuePaymentRow,
  canonicalComboBySubscription: Map<string, string>,
  _comboPrepaidDayBySubscription: Map<string, string>,
  canonicalMonthlyBySubscriptionMonth: Map<string, string> = new Map(),
  firstPaymentBySubscription: Map<string, string> = new Map()
): boolean {
  if (parseStoreOrderMeta(row.status_detail)) {
    return true;
  }

  const subscriptionId = row.subscription_id;
  const subscription = getSubscription(row);

  if (isPaymentBeforeSubscriptionStart(subscription, row)) {
    return false;
  }

  if (isInstallmentSliceRow(row, subscription)) {
    return false;
  }

  if (isPaymentCoveredByPrepaid(subscription, row, firstPaymentBySubscription)) {
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

  if (subscriptionId) {
    const monthKey = subscriptionMonthKey(subscriptionId, row);
    if (monthKey) {
      const canonicalMonthlyId = canonicalMonthlyBySubscriptionMonth.get(monthKey);
      if (canonicalMonthlyId && row.id !== canonicalMonthlyId) {
        return false;
      }
    }
  }

  return true;
}

/** Vendas admin = aquisição (1ª cobrança). Renovações mensais do Asaas não entram. */
export function shouldCountInAdminSales(
  row: RevenuePaymentRow,
  indexes: ReturnType<typeof buildRevenueCountIndexes>
): boolean {
  if (
    !shouldCountPaymentInRevenue(
      row,
      indexes.canonicalComboBySubscription,
      indexes.comboPrepaidDayBySubscription,
      indexes.canonicalMonthlyBySubscriptionMonth,
      indexes.firstPaymentBySubscription
    )
  ) {
    return false;
  }

  if (parseStoreOrderMeta(row.status_detail)) {
    return true;
  }

  if (!row.subscription_id) {
    return true;
  }

  const firstId = indexes.firstPaymentBySubscription.get(row.subscription_id);
  return firstId === row.id;
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
  const indexes = buildRevenueCountIndexes(rows);

  return rows.reduce((sum, row) => {
    if (
      !shouldCountPaymentInRevenue(
        row,
        indexes.canonicalComboBySubscription,
        indexes.comboPrepaidDayBySubscription,
        indexes.canonicalMonthlyBySubscriptionMonth,
        indexes.firstPaymentBySubscription
      )
    ) {
      return sum;
    }
    return sum + resolvePaymentRevenueCents(row);
  }, 0);
}
