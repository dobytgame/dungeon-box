import { parseGalleryUrls } from '@/lib/admin/store-upload';

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
