import { isPlanSlug } from '@/lib/checkout/plans';
import type { StoreProduct } from '@/lib/store/catalog';
import { getStoreProduct, getStoreProductBySlug } from '@/lib/store/catalog';
import {
  isMonthlyKitProductId,
  monthlyKitProductId,
  parseMonthlyKitPlanSlug,
} from '@/lib/store/monthly-kits';
import {
  cartLineId,
  formatProductNameWithVariations,
  formatVariationSummary,
  productHasVariations,
  validateSelectedProductOptions,
} from '@/lib/store/product-variations';

export type CartLine = {
  productId: string;
  quantity: number;
  selectedOptions?: Record<string, string>;
};

export type CartLineResolved = CartLine & {
  lineId: string;
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
  variationSummary?: string;
};

export const STORE_CART_STORAGE_KEY = 'dungeonbox-store-cart-v3';

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

function normalizeSelectedOptions(
  product: StoreProduct | undefined,
  selectedOptions?: Record<string, string>
): Record<string, string> | undefined {
  if (!product || !productHasVariations(product) || !selectedOptions) {
    return undefined;
  }

  const normalized: Record<string, string> = {};
  for (const variation of product.variations ?? []) {
    const value = selectedOptions[variation.name]?.trim();
    if (value && variation.options.includes(value)) {
      normalized[variation.name] = value;
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function normalizeCartLines(
  lines: CartLine[],
  catalog: StoreProduct[] = []
): CartLine[] {
  const merged = new Map<string, CartLine>();

  for (const line of lines) {
    const canonicalId = canonicalizeCartProductId(line.productId, catalog);
    if (!canonicalId) continue;

    const product = findCatalogProduct(canonicalId, catalog);
    const selectedOptions = product
      ? normalizeSelectedOptions(product, line.selectedOptions)
      : line.selectedOptions && Object.keys(line.selectedOptions).length > 0
        ? line.selectedOptions
        : undefined;

    if (product && productHasVariations(product) && !selectedOptions) {
      continue;
    }

    const maxQty = maxQuantityForProduct(product, canonicalId);
    const qty = Math.min(Math.max(Math.floor(line.quantity), 0), maxQty);
    if (qty === 0) continue;

    const normalizedLine: CartLine = {
      productId: canonicalId,
      quantity: qty,
      ...(selectedOptions ? { selectedOptions } : {}),
    };
    const key = cartLineId(normalizedLine);
    const existing = merged.get(key);

    if (existing) {
      merged.set(key, {
        ...existing,
        quantity: Math.min(existing.quantity + qty, maxQty),
      });
      continue;
    }

    merged.set(key, normalizedLine);
  }

  return Array.from(merged.values());
}

export function resolveCartLines(
  lines: CartLine[],
  catalog: StoreProduct[] = []
): CartLineResolved[] {
  return normalizeCartLines(lines, catalog).flatMap((line) => {
    const product = findCatalogProduct(line.productId, catalog);

    if (!product) return [];

    const validation = validateSelectedProductOptions(product, line.selectedOptions);
    if (!validation.ok) return [];

    const variationSummary = formatVariationSummary(line.selectedOptions);

    return [
      {
        ...line,
        lineId: cartLineId(line),
        name: formatProductNameWithVariations(product.name, line.selectedOptions),
        slug: product.slug,
        imageUrl: product.imageUrl ?? product.galleryUrls?.[0],
        priceCents: product.priceCents,
        lineTotalCents: product.priceCents * line.quantity,
        maxQuantity: maxQuantityForProduct(product, line.productId),
        category: product.category,
        subscriptionId: product.subscriptionId,
        themeName: product.themeName,
        originalPriceCents: product.originalPriceCents,
        promoCode: product.promoCode,
        promoSummary: product.promoSummary,
        variationSummary,
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
