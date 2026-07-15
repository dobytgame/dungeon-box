import type { StoreOrderMeta } from '@/lib/asaas/store-order-payment';

export interface AdminStoreOrderLineView {
  name: string;
  quantity: number;
  lineTotalCents: number;
  detail: string | null;
}

export interface AdminStoreOrderPurchaseView {
  orderId: string;
  paymentId?: string;
  items: AdminStoreOrderLineView[];
  amountCents: number;
  shippingLabel: string | null;
  shippingCents: number | null;
  couponCode: string | null;
  couponDiscountCents: number | null;
}

function describeStoreOrderLineDetail(
  line: StoreOrderMeta['items'][number]
): string | null {
  const variationSummary =
    typeof line.variationSummary === 'string' ? line.variationSummary.trim() : '';
  if (variationSummary) return variationSummary;

  const planName = typeof line.planName === 'string' ? line.planName.trim() : '';
  const themeName = typeof line.themeName === 'string' ? line.themeName.trim() : '';
  const parts = [planName, themeName].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function storeOrderLinesFromMeta(
  meta: StoreOrderMeta
): AdminStoreOrderLineView[] {
  return meta.items.map((line) => ({
    name: line.name,
    quantity: line.quantity,
    lineTotalCents: line.lineTotalCents,
    detail: describeStoreOrderLineDetail(line),
  }));
}

export function storeOrderPurchaseFromMeta(
  paymentId: string,
  meta: StoreOrderMeta,
  amountCents: number
): AdminStoreOrderPurchaseView {
  return {
    orderId: meta.orderId,
    paymentId,
    items: storeOrderLinesFromMeta(meta),
    amountCents,
    shippingLabel: meta.shippingLabel ?? null,
    shippingCents: meta.shippingCents ?? null,
    couponCode: meta.couponCode ?? null,
    couponDiscountCents: meta.couponDiscountCents ?? null,
  };
}
