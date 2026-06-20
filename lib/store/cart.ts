import type { StoreProductId } from '@/lib/store/catalog';
import { getStoreProduct } from '@/lib/store/catalog';

export type CartLine = {
  productId: StoreProductId;
  quantity: number;
};

export type CartLineResolved = CartLine & {
  name: string;
  priceCents: number;
  lineTotalCents: number;
};

export const STORE_CART_STORAGE_KEY = 'dungeonbox-store-cart-v1';

export function normalizeCartLines(lines: CartLine[]): CartLine[] {
  const merged = new Map<StoreProductId, number>();

  for (const line of lines) {
    if (!getStoreProduct(line.productId)) continue;
    const qty = Math.min(Math.max(Math.floor(line.quantity), 0), 9);
    if (qty === 0) continue;
    merged.set(line.productId, (merged.get(line.productId) ?? 0) + qty);
  }

  return Array.from(merged.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export function resolveCartLines(lines: CartLine[]): CartLineResolved[] {
  return normalizeCartLines(lines).flatMap((line) => {
    const product = getStoreProduct(line.productId);
    if (!product) return [];
    return [
      {
        ...line,
        name: product.name,
        priceCents: product.priceCents,
        lineTotalCents: product.priceCents * line.quantity,
      },
    ];
  });
}

export function cartSubtotalCents(lines: CartLine[]): number {
  return resolveCartLines(lines).reduce(
    (sum, line) => sum + line.lineTotalCents,
    0
  );
}

export function cartItemCount(lines: CartLine[]): number {
  return normalizeCartLines(lines).reduce((sum, line) => sum + line.quantity, 0);
}
