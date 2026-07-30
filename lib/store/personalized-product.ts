import type { StoreProduct } from '@/lib/store/catalog';

export function productRequiresUnitUploads(
  product: Pick<StoreProduct, 'requiresUnitUploads'>
): boolean {
  return Boolean(product.requiresUnitUploads);
}

export function minQuantityForProduct(
  product: Pick<StoreProduct, 'minQuantity'>
): number {
  return Math.max(1, product.minQuantity ?? 1);
}

export function maxQuantityForProduct(
  product: Pick<StoreProduct, 'maxQuantity' | 'minQuantity'>
): number {
  const max = product.maxQuantity ?? 9;
  return Math.max(minQuantityForProduct(product), max);
}

export function validatePersonalizedLine(
  product: Pick<
    StoreProduct,
    'name' | 'requiresUnitUploads' | 'minQuantity' | 'maxQuantity'
  >,
  quantity: number,
  itemUploads?: string[]
): { ok: true } | { ok: false; error: string } {
  if (!productRequiresUnitUploads(product)) {
    return { ok: true };
  }

  const minQty = minQuantityForProduct(product);
  const maxQty = maxQuantityForProduct(product);

  if (quantity < minQty) {
    return {
      ok: false,
      error: `Pedido mínimo de ${minQty} unidades para ${product.name}.`,
    };
  }

  if (quantity > maxQty) {
    return {
      ok: false,
      error: `Máximo de ${maxQty} unidades por pedido.`,
    };
  }

  const uploads = itemUploads ?? [];
  if (uploads.length !== quantity) {
    return {
      ok: false,
      error: `Envie exatamente ${quantity} imagem(ns), uma por item.`,
    };
  }

  if (uploads.some((path) => !path.trim())) {
    return {
      ok: false,
      error: 'Todas as imagens precisam ser enviadas antes de continuar.',
    };
  }

  return { ok: true };
}
