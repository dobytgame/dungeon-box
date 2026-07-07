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

type SubscriptionContext = {
  billing_term?: string | null;
  combo_total_cents?: number | null;
  combo_installments?: number | null;
};

function getSubscription(row: RevenuePaymentRow): SubscriptionContext | null {
  const subscription = Array.isArray(row.subscriptions)
    ? row.subscriptions[0]
    : row.subscriptions;
  return (subscription as SubscriptionContext | null) ?? null;
}

function paymentDayKey(row: RevenuePaymentRow | null | undefined): string | null {
  if (!row) return null;
  const raw = row.paid_at ?? row.created_at;
  return raw ? raw.slice(0, 10) : null;
}

/** Primeiro pagamento combo_prepaid aprovado por assinatura (venda inicial do combo). */
export function buildCanonicalComboPrepaidIndex(
  rows: RevenuePaymentRow[]
): Map<string, string> {
  const comboRows = rows
    .filter(
      (row) => row.subscription_id && isComboPrepaidPayment(row.status_detail)
    )
    .sort((a, b) => {
      const aTime = a.paid_at ?? a.created_at ?? '';
      const bTime = b.paid_at ?? b.created_at ?? '';
      const cmp = aTime.localeCompare(bTime);
      if (cmp !== 0) return cmp;
      return a.id.localeCompare(b.id);
    });

  const bySubscription = new Map<string, string>();
  for (const row of comboRows) {
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
  comboPrepaidDayBySubscription: Map<string, string>
): boolean {
  if (parseStoreOrderMeta(row.status_detail)) {
    return true;
  }

  const subscriptionId = row.subscription_id;
  const subscription = getSubscription(row);
  const billingTerm = subscription?.billing_term;
  const isComboSub =
    Boolean(subscriptionId) &&
    Boolean(billingTerm) &&
    isComboTerm(billingTerm as BillingTerm);

  if (isComboSub && subscriptionId) {
    const canonicalId = canonicalComboBySubscription.get(subscriptionId);
    if (canonicalId) {
      return row.id === canonicalId;
    }

    if (isComboPrepaidPayment(row.status_detail)) {
      return true;
    }

    return false;
  }

  const isComboPrepaid = isComboPrepaidPayment(row.status_detail);

  if (
    isComboInstallmentSlicePayment(
      {
        amount_cents: row.amount_cents,
        status_detail: row.status_detail,
        installments: row.installments ?? null,
      },
      subscription
    )
  ) {
    return false;
  }

  if (isComboPrepaid && subscriptionId) {
    return canonicalComboBySubscription.get(subscriptionId) === row.id;
  }

  if (isComboSub) {
    const comboDay = comboPrepaidDayBySubscription.get(subscriptionId!);
    const paymentDay = paymentDayKey(row);
    if (comboDay && paymentDay && comboDay === paymentDay) {
      return false;
    }
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
