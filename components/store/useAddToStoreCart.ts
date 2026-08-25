'use client';

import { useStoreCart } from '@/components/store/StoreCartProvider';
import type { StoreProduct } from '@/lib/store/catalog';
import { trackStoreAddToCart } from '@/lib/analytics/store-events';
import {
  formatProductNameWithVariations,
  productHasVariations,
  resolveSelectedVariationImage,
  validateSelectedProductOptions,
} from '@/lib/store/product-variations';

export function useAddToStoreCart(product: StoreProduct) {
  const { addItem } = useStoreCart();

  return function addToCart(
    quantity = 1,
    selectedOptions?: Record<string, string>,
    themeId?: string
  ) {
    const validation = validateSelectedProductOptions(product, selectedOptions);
    if (!validation.ok) {
      throw new Error(validation.error);
    }

    const qty = Math.max(1, quantity);
    const options = productHasVariations(product) ? selectedOptions : undefined;
    const displayName = formatProductNameWithVariations(product.name, options);
    const imageUrl =
      resolveSelectedVariationImage(product, options) ?? product.imageUrl;

    addItem(
      product.id,
      qty,
      {
        name: displayName,
        imageUrl,
        priceCents: product.priceCents,
        quantity: qty,
      },
      options,
      undefined,
      themeId
    );
    trackStoreAddToCart(product, qty);
  };
}
