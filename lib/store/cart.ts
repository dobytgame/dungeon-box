import type { StoreProduct } from '@/lib/store/catalog';
import { getStoreProduct } from '@/lib/store/catalog';
import { isMonthlyKitProductId, parseMonthlyKitPlanSlug } from '@/lib/store/monthly-kits';

export type CartLine = {
  productId: string;
  quantity: number;
};

export type CartLineResolved = CartLine & {
  name: string;
  priceCents: number;
  lineTotalCents: number;
  category?: StoreProduct['category'];
  subscriptionId?: string;
  themeName?: string;
  originalPriceCents?: number;
  promoCode?: string;
  promoSummary?: string;
};

export const STORE_CART_STORAGE_KEY = 'dungeonbox-store-cart-v2';

function maxQuantityForProduct(
  product: StoreProduct | undefined,
  productId: string
): number {
  if (product?.maxQuantity) return product.maxQuantity;
  if (isMonthlyKitProductId(productId)) return 9;
  return 9;
}

export function normalizeCartLines(
  lines: CartLine[],
  catalog: StoreProduct[] = []
): CartLine[] {
  const merged = new Map<string, number>();

  for (const line of lines) {
    const product =
      getStoreProduct(line.productId) ??
      catalog.find((entry) => entry.id === line.productId);

    if (!product) {
      if (
        isMonthlyKitProductId(line.productId) &&
        !parseMonthlyKitPlanSlug(line.productId)
      ) {
        continue;
      }
      if (!isMonthlyKitProductId(line.productId)) continue;
    }

    const maxQty = maxQuantityForProduct(product, line.productId);
    const qty = Math.min(Math.max(Math.floor(line.quantity), 0), maxQty);
    if (qty === 0) continue;
    merged.set(line.productId, (merged.get(line.productId) ?? 0) + qty);
  }

  return Array.from(merged.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export function resolveCartLines(
  lines: CartLine[],
  catalog: StoreProduct[] = []
): CartLineResolved[] {
  return normalizeCartLines(lines, catalog).flatMap((line) => {
    const product =
      getStoreProduct(line.productId) ??
      catalog.find((entry) => entry.id === line.productId);

    if (!product) return [];

    return [
      {
        ...line,
        name: product.name,
        priceCents: product.priceCents,
        lineTotalCents: product.priceCents * line.quantity,
        category: product.category,
        subscriptionId: product.subscriptionId,
        themeName: product.themeName,
        originalPriceCents: product.originalPriceCents,
        promoCode: product.promoCode,
        promoSummary: product.promoSummary,
      },
    ];
  });
}

export function cartSubtotalCents(
  lines: CartLine[],
  catalog: StoreProduct[] = []
): number {
  return resolveCartLines(lines, catalog).reduce(
    (sum, line) => sum + line.lineTotalCents,
    0
  );
}

export function cartItemCount(
  lines: CartLine[],
  catalog: StoreProduct[] = []
): number {
  return normalizeCartLines(lines, catalog).reduce(
    (sum, line) => sum + line.quantity,
    0
  );
}

export function cartHasMonthlyKits(
  lines: CartLine[],
  catalog: StoreProduct[] = []
): boolean {
  return normalizeCartLines(lines, catalog).some((line) =>
    isMonthlyKitProductId(line.productId)
  );
}
