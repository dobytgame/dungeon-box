import type { StoreProduct } from '@/lib/store/catalog';
import {
  maxQuantityForProduct,
  minQuantityForProduct,
} from '@/lib/store/personalized-product';
import { productHasSingleVariation } from '@/lib/store/product-variations';
import type { CartLine } from '@/lib/store/cart';

/** Produtos com uma variação usam min/máx na soma de todas as variedades. */
export function productUsesVarietyQuantityPool(
  product: Pick<StoreProduct, 'variationsEnabled' | 'variations'>
): boolean {
  return productHasSingleVariation(product);
}

export function validateVarietyPoolTotal(
  product: Pick<StoreProduct, 'name' | 'minQuantity' | 'maxQuantity'>,
  totalQuantity: number
): { ok: true } | { ok: false; error: string } {
  const minQty = minQuantityForProduct(product);
  const maxQty = maxQuantityForProduct(product);

  if (totalQuantity < minQty) {
    const remaining = minQty - totalQuantity;
    return {
      ok: false,
      error:
        minQty === 1
          ? 'Selecione ao menos uma unidade para continuar.'
          : `Pedido mínimo de ${minQty} unidades no total. Faltam ${remaining} ${
              remaining === 1 ? 'unidade' : 'unidades'
            }.`,
    };
  }

  if (totalQuantity > maxQty) {
    return {
      ok: false,
      error: `Máximo de ${maxQty} unidades no total para ${product.name}.`,
    };
  }

  return { ok: true };
}

export function maxQuantityForVarietyOption(
  product: Pick<StoreProduct, 'maxQuantity' | 'minQuantity'>,
  totalQuantity: number,
  currentOptionQuantity: number
): number {
  const maxQty = maxQuantityForProduct(product);
  const othersTotal = totalQuantity - currentOptionQuantity;
  return Math.max(0, maxQty - othersTotal);
}

export function sumCartLinesForProduct(
  lines: CartLine[],
  productId: string
): number {
  return lines
    .filter((line) => line.productId === productId)
    .reduce((sum, line) => sum + line.quantity, 0);
}

export function capVarietyPoolCartLines(
  lines: CartLine[],
  resolveProduct: (productId: string) => StoreProduct | undefined
): CartLine[] {
  const poolGroups = new Map<string, CartLine[]>();
  const nonPool: CartLine[] = [];

  for (const line of lines) {
    const product = resolveProduct(line.productId);
    if (product && productUsesVarietyQuantityPool(product)) {
      const group = poolGroups.get(line.productId) ?? [];
      group.push(line);
      poolGroups.set(line.productId, group);
      continue;
    }
    nonPool.push(line);
  }

  const capped: CartLine[] = [...nonPool];

  for (const [productId, group] of Array.from(poolGroups.entries())) {
    const product = resolveProduct(productId);
    if (!product) {
      capped.push(...group);
      continue;
    }

    let remaining = maxQuantityForProduct(product);
    for (const line of group) {
      if (remaining <= 0) break;
      const qty = Math.min(line.quantity, remaining);
      if (qty > 0) {
        capped.push({ ...line, quantity: qty });
        remaining -= qty;
      }
    }
  }

  return capped;
}

export function validateVarietyPoolCartLines(
  lines: CartLine[],
  resolveProduct: (productId: string) => StoreProduct | undefined
): { ok: true } | { ok: false; error: string } {
  const totals = new Map<string, number>();

  for (const line of lines) {
    const product = resolveProduct(line.productId);
    if (!product || !productUsesVarietyQuantityPool(product)) continue;

    totals.set(
      product.id,
      (totals.get(product.id) ?? 0) + line.quantity
    );
  }

  for (const [productId, total] of Array.from(totals.entries())) {
    const product = resolveProduct(productId);
    if (!product) continue;

    const validation = validateVarietyPoolTotal(product, total);
    if (!validation.ok) return validation;
  }

  return { ok: true };
}
