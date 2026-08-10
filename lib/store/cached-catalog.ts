import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { STORE_CATALOG_CACHE_TAG } from '@/lib/store/cache-tags';
import { loadActiveStoreBanners, type StoreBanner } from '@/lib/store/banners';
import {
  loadActiveStoreCategories,
  loadActivePaintKitProducts,
  loadAllActiveStoreProducts,
  loadFeaturedProducts,
  loadNewestProducts,
  type StoreCategory,
} from '@/lib/store/load-catalog';
import { getPublicMonthlyKitProducts } from '@/lib/store/monthly-kits';
import type { StoreProduct } from '@/lib/store/catalog';

export { STORE_CATALOG_CACHE_TAG } from '@/lib/store/cache-tags';
const STORE_CATALOG_REVALIDATE_SECONDS = 120;

export async function getCachedActiveStoreProducts(): Promise<StoreProduct[]> {
  return unstable_cache(
    async () => {
      const admin = createAdminClient();
      return loadAllActiveStoreProducts(admin);
    },
    ['store-catalog-products'],
    {
      revalidate: STORE_CATALOG_REVALIDATE_SECONDS,
      tags: [STORE_CATALOG_CACHE_TAG],
    }
  )();
}

export async function getCachedActiveStoreCategories(): Promise<StoreCategory[]> {
  return unstable_cache(
    async () => {
      const admin = createAdminClient();
      return loadActiveStoreCategories(admin);
    },
    ['store-catalog-categories'],
    {
      revalidate: STORE_CATALOG_REVALIDATE_SECONDS,
      tags: [STORE_CATALOG_CACHE_TAG],
    }
  )();
}

export async function getCachedPublicMonthlyKitProducts(): Promise<StoreProduct[]> {
  return unstable_cache(
    async () => {
      const admin = createAdminClient();
      return getPublicMonthlyKitProducts(admin);
    },
    ['store-catalog-monthly-kits'],
    {
      revalidate: STORE_CATALOG_REVALIDATE_SECONDS,
      tags: [STORE_CATALOG_CACHE_TAG],
    }
  )();
}

export async function getCachedActiveStoreBanners(): Promise<StoreBanner[]> {
  return unstable_cache(
    async () => {
      const admin = createAdminClient();
      return loadActiveStoreBanners(admin);
    },
    ['store-catalog-banners'],
    {
      revalidate: STORE_CATALOG_REVALIDATE_SECONDS,
      tags: [STORE_CATALOG_CACHE_TAG],
    }
  )();
}

export async function getCachedFeaturedProducts(): Promise<StoreProduct[]> {
  return unstable_cache(
    async () => {
      const admin = createAdminClient();
      return loadFeaturedProducts(admin);
    },
    ['store-catalog-featured'],
    {
      revalidate: STORE_CATALOG_REVALIDATE_SECONDS,
      tags: [STORE_CATALOG_CACHE_TAG],
    }
  )();
}

export async function getCachedNewestProducts(): Promise<StoreProduct[]> {
  return unstable_cache(
    async () => {
      const admin = createAdminClient();
      return loadNewestProducts(admin);
    },
    ['store-catalog-newest'],
    {
      revalidate: STORE_CATALOG_REVALIDATE_SECONDS,
      tags: [STORE_CATALOG_CACHE_TAG],
    }
  )();
}

export async function getCachedPaintKitProducts(): Promise<StoreProduct[]> {
  return unstable_cache(
    async () => {
      const admin = createAdminClient();
      return loadActivePaintKitProducts(admin);
    },
    ['store-catalog-paint-kits'],
    {
      revalidate: STORE_CATALOG_REVALIDATE_SECONDS,
      tags: [STORE_CATALOG_CACHE_TAG],
    }
  )();
}
