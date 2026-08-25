import { isPlanSlug } from '@/lib/checkout/plans';
import type { StoreProduct } from '@/lib/store/catalog';
import {
  getStoreProduct,
  getStoreProductBySlug,
  productRequiresKitTheme,
} from '@/lib/store/catalog';
import {
  findStoreKitTheme,
  formatStoreKitThemeLabel,
} from '@/lib/store/kit-themes';
import {
  isMonthlyKitProductId,
  monthlyKitProductId,
  parseMonthlyKitPlanSlug,
} from '@/lib/store/monthly-kits';
import {
  cartLineId,
  findVariationOption,
  formatProductNameWithVariations,
  formatVariationSummary,
  productHasVariations,
  resolveSelectedVariationImage,
  validateSelectedProductOptions,
} from '@/lib/store/product-variations';
import {
  maxQuantityForProduct,
  minQuantityForProduct,
  productRequiresUnitUploads,
  validatePersonalizedLine,
} from '@/lib/store/personalized-product';
import {
  capVarietyPoolCartLines,
  productUsesVarietyQuantityPool,
} from '@/lib/store/variety-quantity-pool';

export type CartLine = {
  productId: string;
  quantity: number;
  selectedOptions?: Record<string, string>;
  /** Tema escolhido nos kits mensais da loja. */
  themeId?: string;
  /** Caminhos no storage — 1 por unidade em produtos personalizados. */
  itemUploads?: string[];
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
  itemUploads?: string[];
  requiresUnitUploads?: boolean;
  minQuantity?: number;
  uploadsComplete?: boolean;
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

function maxQuantityForCartProduct(
  product: StoreProduct | undefined,
  productId: string
): number {
  if (product) return maxQuantityForProduct(product);
  if (isMonthlyKitProductId(productId)) return 9;
  return 9;
}

function minQuantityForCartProduct(
  product: StoreProduct | undefined
): number {
  if (!product) return 1;
  return minQuantityForProduct(product);
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
    if (value && findVariationOption(variation, value)) {
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
    const themeId =
      product && productRequiresKitTheme(product)
        ? findStoreKitTheme(product.kitThemes ?? [], line.themeId)?.id
        : undefined;

    if (product && productHasVariations(product) && !selectedOptions) {
      continue;
    }

    if (product && productRequiresKitTheme(product) && !themeId) {
      continue;
    }

    const itemUploads =
      line.itemUploads && line.itemUploads.length > 0
        ? line.itemUploads.filter(Boolean)
        : undefined;

    if (product && productRequiresUnitUploads(product)) {
      const minQty = minQuantityForCartProduct(product);
      const maxQty = maxQuantityForCartProduct(product, canonicalId);
      const qty = Math.min(Math.max(Math.floor(line.quantity), minQty), maxQty);
      if (qty === 0) continue;

      const itemUploads =
        line.itemUploads && line.itemUploads.length > 0
          ? line.itemUploads.filter(Boolean).slice(0, qty)
          : undefined;

      const normalizedLine: CartLine = {
        productId: canonicalId,
        quantity: qty,
        ...(itemUploads ? { itemUploads } : {}),
      };
      const key = cartLineId(normalizedLine);
      const existing = merged.get(key);

      if (existing) {
        merged.set(key, {
          ...existing,
          quantity: Math.min(existing.quantity + qty, maxQty),
          ...(itemUploads ? { itemUploads } : {}),
        });
        continue;
      }

      merged.set(key, normalizedLine);
      continue;
    }

    const maxQty = maxQuantityForCartProduct(product, canonicalId);
    const minQty = minQuantityForCartProduct(product);
    const usesPool = product ? productUsesVarietyQuantityPool(product) : false;
    const qty = usesPool
      ? Math.min(Math.max(Math.floor(line.quantity), 0), maxQty)
      : Math.min(Math.max(Math.floor(line.quantity), minQty), maxQty);
    if (qty === 0) continue;

    const normalizedLine: CartLine = {
      productId: canonicalId,
      quantity: qty,
      ...(selectedOptions ? { selectedOptions } : {}),
      ...(themeId ? { themeId } : {}),
      ...(itemUploads ? { itemUploads: itemUploads.slice(0, qty) } : {}),
    };
    const key = cartLineId(normalizedLine);
    const existing = merged.get(key);

    if (existing) {
      const nextQuantity = existing.quantity + qty;
      merged.set(key, {
        ...existing,
        quantity: usesPool
          ? nextQuantity
          : Math.min(nextQuantity, maxQty),
        ...(itemUploads ? { itemUploads } : {}),
      });
      continue;
    }

    merged.set(key, normalizedLine);
  }

  return capVarietyPoolCartLines(Array.from(merged.values()), (productId) =>
    findCatalogProduct(productId, catalog)
  );
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

    const personalized = validatePersonalizedLine(
      product,
      line.quantity,
      line.itemUploads
    );

    const variationSummary = formatVariationSummary(line.selectedOptions);

    return [
      {
        ...line,
        lineId: cartLineId(line),
        name: formatProductNameWithVariations(product.name, line.selectedOptions),
        slug: product.slug,
        imageUrl:
          resolveSelectedVariationImage(product, line.selectedOptions) ??
          findStoreKitTheme(product.kitThemes ?? [], line.themeId)?.imageUrl ??
          product.imageUrl ??
          product.galleryUrls?.[0],
        priceCents: product.priceCents,
        lineTotalCents: product.priceCents * line.quantity,
        maxQuantity: maxQuantityForCartProduct(product, line.productId),
        minQuantity: minQuantityForCartProduct(product),
        category: product.category,
        subscriptionId: product.subscriptionId,
        themeName: (() => {
          const selected = findStoreKitTheme(product.kitThemes ?? [], line.themeId);
          return selected
            ? formatStoreKitThemeLabel(selected)
            : product.themeName;
        })(),
        originalPriceCents: product.originalPriceCents,
        promoCode: product.promoCode,
        promoSummary: product.promoSummary,
        variationSummary,
        itemUploads: line.itemUploads,
        requiresUnitUploads: productRequiresUnitUploads(product),
        uploadsComplete: personalized.ok,
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
