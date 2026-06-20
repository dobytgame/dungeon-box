import type { PlanSlug } from '@/lib/checkout/plans';
import type { AnalyticsEcommerceItem } from '@/lib/analytics/checkout-items';

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

const BEGIN_CHECKOUT_SESSION_KEY = 'dbx_begin_checkout';

export function pushDataLayer(payload: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(payload);
}

function pushEcommerceEvent(
  event: string,
  extra: Record<string, unknown>,
  items: AnalyticsEcommerceItem[],
  value?: number
): void {
  pushDataLayer({
    event,
    ...extra,
    ecommerce: {
      currency: 'BRL',
      ...(value != null ? { value } : {}),
      items: items.map((item, index) => ({
        ...item,
        index,
      })),
    },
  });
}

export function trackViewItemList(items: {
  item_id: string;
  item_name: string;
  price: number;
}[]): void {
  pushEcommerceEvent(
    'view_item_list',
    {
      item_list_id: 'planos',
      item_list_name: 'Planos DungeonBox',
    },
    items.map((item) => ({
      ...item,
      item_category: 'Assinatura mensal',
      quantity: 1,
    }))
  );
}

export function trackBeginCheckout(input: {
  planSlug?: string;
  planName?: string;
  value?: number;
  location: string;
  items?: AnalyticsEcommerceItem[];
}): void {
  if (typeof window !== 'undefined' && input.location !== 'checkout_entry') {
    sessionStorage.setItem(BEGIN_CHECKOUT_SESSION_KEY, String(Date.now()));
  }

  const items =
    input.items ??
    (input.planSlug
      ? [
          {
            item_id: input.planSlug,
            item_name: input.planName ?? input.planSlug,
            item_category: 'Assinatura mensal',
            quantity: 1,
            price: input.value ?? 0,
          },
        ]
      : []);

  pushDataLayer({
    event: 'begin_checkout',
    cta_location: input.location,
    ecommerce: {
      currency: 'BRL',
      value: input.value,
      items: items.map((item, index) => ({
        ...item,
        index,
      })),
    },
  });
}

/** Entrada direta no checkout (ex.: anúncio) sem duplicar clique da home. */
export function trackBeginCheckoutEntry(input: {
  items: AnalyticsEcommerceItem[];
  value?: number;
}): void {
  if (typeof window !== 'undefined') {
    const recent = sessionStorage.getItem(BEGIN_CHECKOUT_SESSION_KEY);
    if (recent) {
      const age = Date.now() - Number(recent);
      if (!Number.isNaN(age) && age < 30_000) {
        return;
      }
    }
  }

  trackBeginCheckout({
    location: 'checkout_entry',
    items: input.items,
    value: input.value,
  });
}

export function trackAddShippingInfo(input: {
  items: AnalyticsEcommerceItem[];
  value?: number;
}): void {
  pushEcommerceEvent('add_shipping_info', {}, input.items, input.value);
}

export function trackAddPaymentInfo(input: {
  items: AnalyticsEcommerceItem[];
  value?: number;
}): void {
  pushEcommerceEvent('add_payment_info', {}, input.items, input.value);
}

export function trackPurchase(input: {
  transactionId: string;
  value: number;
  items: Array<{
    item_id: PlanSlug | string;
    item_name: string;
    price: number;
    item_category?: string;
  }>;
  coupon?: string | null;
}): void {
  pushDataLayer({
    event: 'purchase',
    ecommerce: {
      transaction_id: input.transactionId,
      currency: 'BRL',
      value: input.value,
      ...(input.coupon ? { coupon: input.coupon } : {}),
      items: input.items.map((item, index) => ({
        ...item,
        index,
        item_category: item.item_category ?? 'Assinatura mensal',
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
