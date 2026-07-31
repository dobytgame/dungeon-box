import { parseGalleryUrls } from '@/lib/admin/store-upload';
import type { StoreProduct } from '@/lib/store/catalog';
import { collectVariationImageUrls } from '@/lib/store/product-variations';

/** Dimensão de referência das fotos de produto (quadrado). */
export const STORE_PRODUCT_IMAGE_SIZE = 800;

export const storeProductImageClassName =
  'aspect-square w-full object-cover';

export const storeProductThumbClassName =
  'aspect-square w-full object-cover';

export function normalizeStoreGalleryUrls(
  value: string[] | string | null | undefined
): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter((url) => typeof url === 'string' && url.trim().length > 0);
  }
  if (typeof value === 'string') {
    return parseGalleryUrls(value);
  }
  return [];
}

export function resolveStoreProductPrimaryImageUrl(
  imageUrl: string | null | undefined,
  galleryUrls: string[] | string | null | undefined
): string | undefined {
  const normalizedGallery = normalizeStoreGalleryUrls(galleryUrls);
  const primary = imageUrl?.trim();
  return primary || normalizedGallery[0] || undefined;
}

export function buildStoreProductGalleryImages(
  product: Pick<StoreProduct, 'imageUrl' | 'galleryUrls' | 'variations'>
): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  const candidates = [
    ...(product.imageUrl?.trim() ? [product.imageUrl.trim()] : []),
    ...normalizeStoreGalleryUrls(product.galleryUrls),
    ...collectVariationImageUrls(product.variations),
  ];

  for (const url of candidates) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }

  return urls;
}
