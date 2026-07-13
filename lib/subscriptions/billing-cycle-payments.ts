import { PAINT_KIT_BUMPS } from '@/lib/checkout/order-bumps';
import { monthKeyFromDate } from '@/lib/admin/chart-period';
import {
  isOneTimeCheckoutExternalReference,
  isPaintKitExternalReference,
} from '@/lib/asaas/refs';

const PAINT_KIT_ADDON_AMOUNTS = new Set<number>(
  PAINT_KIT_BUMPS.map((bump) => bump.priceCents)
);

export type BillingPaymentRow = {
  id: string;
  amount_cents: number | null;
  paid_at: string | null;
  created_at: string | null;
};

export function isPaintKitAddonAmount(
  amountCents: number | null | undefined
): boolean {
  if (amountCents == null) return false;
  return PAINT_KIT_ADDON_AMOUNTS.has(amountCents);
}

export function isNonBillingAsaasPayment(input: {
  externalReference?: string | null;
  amountCents?: number | null;
}): boolean {
  if (isPaintKitExternalReference(input.externalReference)) return true;
  if (isOneTimeCheckoutExternalReference(input.externalReference)) return true;
  if (isPaintKitAddonAmount(input.amountCents)) return true;
  return false;
}

/** Pagamentos que avançam ciclo de assinatura mensal (exclui kit de pintura e cobranças :one-time do checkout). */
export function filterSubscriptionBillingPayments<T extends BillingPaymentRow>(
  payments: T[]
): T[] {
  const billing = payments.filter(
    (payment) => !isPaintKitAddonAmount(payment.amount_cents)
  );
  return billing.length > 0 ? billing : payments;
}

export function sortBillingPayments<T extends BillingPaymentRow>(
  payments: T[]
): T[] {
  return [...payments].sort((a, b) => {
    const aAt = a.paid_at ?? a.created_at ?? '';
    const bAt = b.paid_at ?? b.created_at ?? '';
    return aAt.localeCompare(bAt);
  });
}

/** Deduplica cobranças no mesmo mês calendário de pagamento (ex.: kit + assinatura no checkout). */
export function dedupeBillingPaymentsByBillingMonth<T extends BillingPaymentRow>(
  payments: T[]
): T[] {
  const sorted = sortBillingPayments(payments);
  const byMonth = new Map<string, T>();

  for (const payment of sorted) {
    const paidAt = payment.paid_at ?? payment.created_at;
    if (!paidAt) continue;

    const monthKey = monthKeyFromDate(new Date(paidAt));
    const existing = byMonth.get(monthKey);
    if (!existing) {
      byMonth.set(monthKey, payment);
      continue;
    }

    const existingAmount = existing.amount_cents ?? 0;
    const currentAmount = payment.amount_cents ?? 0;
    if (currentAmount > existingAmount) {
      byMonth.set(monthKey, payment);
    }
  }

  return sortBillingPayments(Array.from(byMonth.values()));
}

/** @deprecated Use dedupeBillingPaymentsByBillingMonth */
export function dedupeBillingPaymentsByProductionMonth<T extends BillingPaymentRow>(
  payments: T[]
): T[] {
  return dedupeBillingPaymentsByBillingMonth(payments);
}

export function prepareBillingCyclePayments<T extends BillingPaymentRow>(
  payments: T[]
): T[] {
  return dedupeBillingPaymentsByBillingMonth(
    filterSubscriptionBillingPayments(payments)
  );
}
