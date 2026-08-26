import type { PaintKitBumpId } from '@/lib/checkout/order-bumps';
import { getStoreProduct } from '@/lib/store/catalog';

type StoreLineLike = {
  productId?: string | null;
  name?: string | null;
  paintKitBumpId?: PaintKitBumpId | null;
};

function bumpFromProductId(productId: string): PaintKitBumpId | null {
  const id = productId.trim().toLowerCase();
  if (!id) return null;
  if (
    id === 'paint-kit-amador' ||
    id === 'kit-pintura-amador' ||
    id.endsWith('kit-pintura-amador')
  ) {
    return 'amador';
  }
  if (
    id === 'paint-kit-profissional' ||
    id === 'kit-pintura-profissional' ||
    id.endsWith('kit-pintura-profissional')
  ) {
    return 'profissional';
  }
  return null;
}

function bumpFromName(name: string): PaintKitBumpId | null {
  const normalized = name.trim().toLowerCase();
  if (!normalized.includes('pintura')) return null;
  if (normalized.includes('profissional')) return 'profissional';
  if (normalized.includes('amador')) return 'amador';
  return null;
}

/** Identifica o kit de pintura extra numa linha de pedido da loja ou da assinatura. */
export function resolvePaintKitBumpFromStoreLine(
  line: StoreLineLike | null | undefined
): PaintKitBumpId | null {
  if (!line) return null;

  if (line.paintKitBumpId === 'amador' || line.paintKitBumpId === 'profissional') {
    return line.paintKitBumpId;
  }

  const productId = line.productId?.trim() ?? '';
  if (productId) {
    const fromId = bumpFromProductId(productId);
    if (fromId) return fromId;

    const product = getStoreProduct(productId);
    if (product?.paintKitBumpId) return product.paintKitBumpId;
  }

  return bumpFromName(line.name ?? '');
}

export function storeOrderHasPaintKit(items: StoreLineLike[]): boolean {
  return items.some((item) => resolvePaintKitBumpFromStoreLine(item) !== null);
}
