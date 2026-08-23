import { PAINT_KIT_BUMPS } from '@/lib/checkout/order-bumps';
import { monthKeyFromDate } from '@/lib/admin/chart-period';
import {
  isOneTimeCheckoutExternalReference,
  isPaintKitExternalReference,
} from '@/lib/asaas/refs';
import {
  parseStoreOrderExternalReference,
  parseStoreOrderMeta,
} from '@/lib/asaas/store-order-payment';

const PAINT_KIT_ADDON_AMOUNTS = new Set<number>(
  PAINT_KIT_BUMPS.map((bump) => bump.priceCents)
);

export type BillingPaymentRow = {
  id: string;
  amount_cents: number | null;
  paid_at: string | null;
  created_at: string | null;
  status_detail?: string | null;
};

export function isPaintKitAddonAmount(
  amountCents: number | null | undefined
): boolean {
  if (amountCents == null) return false;
  return PAINT_KIT_ADDON_AMOUNTS.has(amountCents);
}

/** Pedido da loja (qualquer um) — webhook de assinatura não deve tratar como mensalidade. */
export function isStoreOrderBillingPayment(payment: {
  status_detail?: string | null;
}): boolean {
  return Boolean(parseStoreOrderMeta(payment.status_detail));
}

function storeOrderHasCatalogItem(payment: {
  status_detail?: string | null;
}): boolean {
  const meta = parseStoreOrderMeta(payment.status_detail);
  if (!meta) return false;
  return meta.items.some((item) => item.kind === 'catalog');
}

function storeOrderHasMonthlyKit(payment: {
  status_detail?: string | null;
}): boolean {
  const meta = parseStoreOrderMeta(payment.status_detail);
  if (!meta) return false;
  return meta.items.some((item) => item.kind === 'monthly-kit');
}

/**
 * Kit adicional da loja (pintura, kit do mês extra) não entra no ciclo.
 * O primeiro pagamento da assinatura, se for kit do mês importado/origem, conta como ciclo 1.
 */
export function isExtraStoreKitPayment<T extends BillingPaymentRow>(
  payment: T,
  earliestApprovedPaymentId?: string | null
): boolean {
  const meta = parseStoreOrderMeta(payment.status_detail);
  if (!meta) return false;
  if (storeOrderHasCatalogItem(payment)) return true;
  if (!storeOrderHasMonthlyKit(payment)) return true;
  if (!earliestApprovedPaymentId) return true;
  return payment.id !== earliestApprovedPaymentId;
}

export function isNonBillingAsaasPayment(input: {
  externalReference?: string | null;
  amountCents?: number | null;
  statusDetail?: string | null;
}): boolean {
  if (parseStoreOrderExternalReference(input.externalReference)) return true;
  if (parseStoreOrderMeta(input.statusDetail)) return true;
  if (isPaintKitExternalReference(input.externalReference)) return true;
  if (isOneTimeCheckoutExternalReference(input.externalReference)) return true;
  if (isPaintKitAddonAmount(input.amountCents)) return true;
  return false;
}

/**
 * Pagamentos que avançam ciclo de assinatura mensal.
 * Kit adicional da loja nunca entra. Kit de pintura no checkout também não.
 * Kit do mês que originou a assinatura (primeiro pagamento) conta.
 */
export function filterSubscriptionBillingPayments<T extends BillingPaymentRow>(
  payments: T[]
): T[] {
  const sorted = sortBillingPayments(payments);
  const earliestId = sorted[0]?.id ?? null;
  return sorted.filter((payment) => {
    if (isExtraStoreKitPayment(payment, earliestId)) return false;
    if (isPaintKitAddonAmount(payment.amount_cents)) return false;
    return true;
  });
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
