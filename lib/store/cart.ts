import { isPlanSlug } from '@/lib/checkout/plans';
import type { StoreProduct } from '@/lib/store/catalog';
import { getStoreProduct, getStoreProductBySlug } from '@/lib/store/catalog';
import {
  isMonthlyKitProductId,
  monthlyKitProductId,
  parseMonthlyKitPlanSlug,
} from '@/lib/store/monthly-kits';

export type CartLine = {
  productId: string;
  quantity: number;
};

export type CartLineResolved = CartLine & {
  name: string;
  slug?: string;
  imageUrl?: string;
  priceCents: number;
  lineTotalCents: number;
  maxQuantity?: number;
  category?: StoreProduct['category'];
  subscriptionId?: string;
  themeName?: string;
  originalPriceCents?: number;
  promoCode?: string;
  promoSummary?: string;
};

export const STORE_CART_STORAGE_KEY = 'dungeonbox-store-cart-v2';

function findCatalogProduct(
  productId: string,
  catalog: StoreProduct[] = []
): StoreProduct | undefined {
  return (
    getStoreProduct(productId) ??
    getStoreProductBySlug(productId) ??
    catalog.find((entry) => entry.id === productId) ??
    catalog.find((entry) => entry.slug === productId)
  );
}

/** Resolve slug / alias para o ID canônico usado no checkout e no Asaas. */
export function canonicalizeCartProductId(
  productId: string,
  catalog: StoreProduct[] = []
): string | null {
  const product = findCatalogProduct(productId, catalog);
  if (product) return product.id;

  if (isMonthlyKitProductId(productId) && parseMonthlyKitPlanSlug(productId)) {
    return productId;
  }

  if (productId.startsWith('kit-avulso-')) {
    const slug = productId.slice('kit-avulso-'.length);
    if (isPlanSlug(slug)) {
      return monthlyKitProductId(slug);
    }
  }

  return null;
}

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
    const canonicalId = canonicalizeCartProductId(line.productId, catalog);
    if (!canonicalId) continue;

    const product = findCatalogProduct(canonicalId, catalog);
    const maxQty = maxQuantityForProduct(product, canonicalId);
    const qty = Math.min(Math.max(Math.floor(line.quantity), 0), maxQty);
    if (qty === 0) continue;
    merged.set(canonicalId, (merged.get(canonicalId) ?? 0) + qty);
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
    const product = findCatalogProduct(line.productId, catalog);

    if (!product) return [];

    return [
      {
        ...line,
        name: product.name,
        slug: product.slug,
        imageUrl: product.imageUrl,
        priceCents: product.priceCents,
        lineTotalCents: product.priceCents * line.quantity,
        maxQuantity: maxQuantityForProduct(product, line.productId),
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
