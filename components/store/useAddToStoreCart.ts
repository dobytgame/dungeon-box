'use client';

import { useStoreCart } from '@/components/store/StoreCartProvider';
import type { StoreProduct } from '@/lib/store/catalog';
import { trackStoreAddToCart } from '@/lib/analytics/store-events';

export function useAddToStoreCart(product: StoreProduct) {
  const { addItem } = useStoreCart();

  return function addToCart(quantity = 1) {
    const qty = Math.max(1, quantity);
    addItem(product.id, qty, {
      name: product.name,
      imageUrl: product.imageUrl,
      priceCents: product.priceCents,
      quantity: qty,
    });
    trackStoreAddToCart(product, qty);
  };
}
