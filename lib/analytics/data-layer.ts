import type { PlanSlug } from '@/lib/checkout/plans';

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function pushDataLayer(payload: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(payload);
}

export function trackViewItemList(items: {
  item_id: string;
  item_name: string;
  price: number;
}[]): void {
  pushDataLayer({
    event: 'view_item_list',
    ecommerce: {
      item_list_id: 'planos',
      item_list_name: 'Planos DungeonBox',
      items: items.map((item, index) => ({
        ...item,
        index,
        item_category: 'Assinatura mensal',
        quantity: 1,
      })),
    },
  });
}

export function trackBeginCheckout(input: {
  planSlug?: string;
  planName?: string;
  value?: number;
  location: string;
}): void {
  pushDataLayer({
    event: 'begin_checkout',
    cta_location: input.location,
    ecommerce: {
      currency: 'BRL',
      value: input.value,
      items: input.planSlug
        ? [
            {
              item_id: input.planSlug,
              item_name: input.planName ?? input.planSlug,
              item_category: 'Assinatura mensal',
              quantity: 1,
              price: input.value,
            },
          ]
        : [],
    },
  });
}

export function trackPurchase(input: {
  transactionId: string;
  value: number;
  items: Array<{
    item_id: PlanSlug | string;
    item_name: string;
    price: number;
  }>;
}): void {
  pushDataLayer({
    event: 'purchase',
    ecommerce: {
      transaction_id: input.transactionId,
      currency: 'BRL',
      value: input.value,
      items: input.items.map((item, index) => ({
        ...item,
        index,
        item_category: 'Assinatura mensal',
        quantity: 1,
      })),
    },
  });
}

export function parseCheckoutPlanSlug(href: string): PlanSlug | undefined {
  const match = href.match(/[?&]plan=([a-z]+)/);
  const slug = match?.[1];
  if (slug === 'aventureiro' || slug === 'heroi' || slug === 'lendario') {
    return slug;
  }
  return undefined;
}
