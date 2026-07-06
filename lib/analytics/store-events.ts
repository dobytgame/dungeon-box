import type { StoreProduct } from '@/lib/store/catalog';
import {
  pushDataLayer,
  trackAddPaymentInfo,
  trackAddShippingInfo,
  trackBeginCheckout,
} from '@/lib/analytics/data-layer';
import type { AnalyticsEcommerceItem } from '@/lib/analytics/checkout-items';

export function storeProductToAnalyticsItem(
  product: Pick<
    StoreProduct,
    'id' | 'name' | 'priceCents' | 'category' | 'storeCategoryName'
  >,
  quantity = 1
): AnalyticsEcommerceItem {
  return {
    item_id: String(product.id),
    item_name: product.name,
    price: product.priceCents / 100,
    quantity,
    item_category: product.storeCategoryName ?? product.category,
  };
}

export function trackStoreViewItem(product: StoreProduct): void {
  const item = storeProductToAnalyticsItem(product);
  pushDataLayer({
    event: 'view_item',
    ecommerce: {
      currency: 'BRL',
      value: item.price,
      items: [{ ...item, index: 0 }],
    },
  });
}

export function trackStoreAddToCart(
  product: StoreProduct,
  quantity = 1
): void {
  const item = storeProductToAnalyticsItem(product, quantity);
  pushDataLayer({
    event: 'add_to_cart',
    ecommerce: {
      currency: 'BRL',
      value: (item.price ?? 0) * quantity,
      items: [{ ...item, index: 0 }],
    },
  });
}

export function trackStoreBeginCheckout(
  items: AnalyticsEcommerceItem[],
  value: number
): void {
  trackBeginCheckout({
    location: 'store_checkout',
    items,
    value,
  });
}

export function trackStoreAddShippingInfo(
  items: AnalyticsEcommerceItem[],
  value: number
): void {
  trackAddShippingInfo({ items, value });
}

export function trackStoreAddPaymentInfo(
  items: AnalyticsEcommerceItem[],
  value: number
): void {
  trackAddPaymentInfo({ items, value });
}
