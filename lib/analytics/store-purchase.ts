import type { AnalyticsEcommerceItem } from '@/lib/analytics/checkout-items';

type StoreOrderItemMeta = {
  productId: string;
  kind: 'monthly-kit' | 'catalog';
  quantity: number;
  name: string;
  lineTotalCents: number;
};

type StoreOrderMetaLike = {
  orderId: string;
  items: StoreOrderItemMeta[];
};

export type StoreOrderPurchaseAnalytics = {
  transactionId: string;
  value: number;
  contentName: string;
  items: AnalyticsEcommerceItem[];
};

function itemCategory(kind: StoreOrderItemMeta['kind']): string {
  return kind === 'monthly-kit' ? 'Kit do mês' : 'Loja';
}

export function buildStoreOrderPurchaseAnalytics(
  meta: StoreOrderMetaLike,
  amountCents?: number | null
): StoreOrderPurchaseAnalytics | null {
  if (meta.items.length === 0) return null;

  const items: AnalyticsEcommerceItem[] = meta.items.map((item) => ({
    item_id: item.productId,
    item_name: item.name,
    price: item.lineTotalCents / item.quantity / 100,
    item_category: itemCategory(item.kind),
    quantity: item.quantity,
  }));

  const calculatedCents = meta.items.reduce(
    (sum, item) => sum + item.lineTotalCents,
    0
  );
  const valueCents =
    amountCents != null && amountCents > 0 ? amountCents : calculatedCents;

  const contentName =
    meta.items.length === 1
      ? meta.items[0]!.name
      : meta.items.map((item) => `${item.quantity}x ${item.name}`).join(', ');

  return {
    transactionId: meta.orderId,
    value: valueCents / 100,
    contentName,
    items,
  };
}

export function storePurchaseTrackingKey(orderId: string): string {
  return `dbx_store_purchase_tracked:${orderId}`;
}

export function hasTrackedStorePurchase(orderId: string): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(storePurchaseTrackingKey(orderId)) === '1';
}

export function markStorePurchaseTracked(orderId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(storePurchaseTrackingKey(orderId), '1');
}
