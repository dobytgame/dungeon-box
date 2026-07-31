import type { StoreProduct } from '@/lib/store/catalog';
import { getStoreProduct, getStoreProductBySlug } from '@/lib/store/catalog';
import type { CartLine } from '@/lib/store/cart';
import { canonicalizeCartProductId, normalizeCartLines } from '@/lib/store/cart';
import {
  maxQuantityForProduct,
  minQuantityForProduct,
  validatePersonalizedLine,
} from '@/lib/store/personalized-product';
import {
  maxQuantityForVarietyOption,
  productUsesVarietyQuantityPool,
  sumCartLinesForProduct,
  validateVarietyPoolTotal,
} from '@/lib/store/variety-quantity-pool';
import { STORE_ROUTES } from '@/lib/store/routes';
import {
  productRequiresUnitUploads,
} from '@/lib/store/personalized-product';

export type CartValidationIssue = {
  productId: string;
  productName: string;
  error: string;
  kind?: 'quantity' | 'personalized_upload' | 'variety_pool';
  actionHref?: string;
  actionLabel?: string;
};

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

export function maxQuantityForCartLine(
  line: CartLine,
  lines: CartLine[],
  catalog: StoreProduct[] = []
): number {
  const productId =
    canonicalizeCartProductId(line.productId, catalog) ?? line.productId;
  const product = findCatalogProduct(productId, catalog);
  if (!product) return 9;

  if (productUsesVarietyQuantityPool(product)) {
    const normalized = normalizeCartLines(lines, catalog);
    const total = sumCartLinesForProduct(normalized, productId);
    return maxQuantityForVarietyOption(product, total, line.quantity);
  }

  return maxQuantityForProduct(product);
}

export function getCartValidationIssues(
  lines: CartLine[],
  catalog: StoreProduct[] = []
): CartValidationIssue[] {
  const normalized = normalizeCartLines(lines, catalog);
  const issues: CartValidationIssue[] = [];
  const poolTotals = new Map<string, { product: StoreProduct; total: number }>();
  const seenPool = new Set<string>();

  for (const line of normalized) {
    const productId =
      canonicalizeCartProductId(line.productId, catalog) ?? line.productId;
    const product = findCatalogProduct(productId, catalog);
    if (!product) continue;

    if (productUsesVarietyQuantityPool(product)) {
      const current = poolTotals.get(product.id);
      if (current) {
        current.total += line.quantity;
      } else {
        poolTotals.set(product.id, { product, total: line.quantity });
      }
      continue;
    }

    if (productRequiresUnitUploads(product)) {
      const personalized = validatePersonalizedLine(
        product,
        line.quantity,
        line.itemUploads
      );
      if (!personalized.ok) {
        const uploadedCount = line.itemUploads?.filter(Boolean).length ?? 0;
        issues.push({
          productId: product.id,
          productName: product.name,
          error:
            uploadedCount === 0
              ? `${product.name}: envie as imagens de personalização antes de finalizar a compra.`
              : `${product.name}: ${personalized.error}`,
          kind: 'personalized_upload',
          actionHref: product.slug ? STORE_ROUTES.product(product.slug) : undefined,
          actionLabel: 'Ir para o produto e enviar imagens',
        });
      }
      continue;
    }

    const minQty = minQuantityForProduct(product);
    if (minQty > 1 && line.quantity < minQty) {
      issues.push({
        productId: product.id,
        productName: product.name,
        error: `Pedido mínimo de ${minQty} unidades para ${product.name}.`,
        kind: 'quantity',
      });
    }
  }

  for (const { product, total } of Array.from(poolTotals.values())) {
    if (seenPool.has(product.id)) continue;
    seenPool.add(product.id);

    const validation = validateVarietyPoolTotal(product, total);
    if (!validation.ok) {
      issues.push({
        productId: product.id,
        productName: product.name,
        error: `${product.name}: ${validation.error}`,
      });
    }
  }

  return issues;
}

export function validateCartLines(
  lines: CartLine[],
  catalog: StoreProduct[] = []
): { ok: true } | { ok: false; error: string } {
  const issues = getCartValidationIssues(lines, catalog);
  if (issues.length === 0) return { ok: true };
  return { ok: false, error: issues[0].error };
}
