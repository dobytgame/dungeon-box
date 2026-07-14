'use client';

import { useStoreCart } from '@/components/store/StoreCartProvider';
import type { StoreProduct } from '@/lib/store/catalog';
import { trackStoreAddToCart } from '@/lib/analytics/store-events';
import {
  formatProductNameWithVariations,
  productHasVariations,
  validateSelectedProductOptions,
} from '@/lib/store/product-variations';

export function useAddToStoreCart(product: StoreProduct) {
  const { addItem } = useStoreCart();

  return function addToCart(
    quantity = 1,
    selectedOptions?: Record<string, string>
  ) {
    const validation = validateSelectedProductOptions(product, selectedOptions);
    if (!validation.ok) {
      throw new Error(validation.error);
    }

    const qty = Math.max(1, quantity);
    const options = productHasVariations(product) ? selectedOptions : undefined;
    const displayName = formatProductNameWithVariations(product.name, options);

    addItem(
      product.id,
      qty,
      {
        name: displayName,
        imageUrl: product.imageUrl,
        priceCents: product.priceCents,
        quantity: qty,
      },
      options
    );
    trackStoreAddToCart(product, qty);
  };
}
