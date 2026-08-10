import type { SupabaseClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { STORE_CATALOG_CACHE_TAG } from '@/lib/store/cache-tags';
import type { StoreProductCategory } from '@/lib/store/catalog';

type CategoryStatusRow = {
  id: string;
  slug: string;
  parent_id: string | null;
  is_active: boolean;
};

export type StoreCategoryVisibilityContext = {
  visibleCategoryIds: Set<string>;
  slugToId: Map<string, string>;
};

type SerializableVisibility = {
  visibleCategoryIds: string[];
  slugToId: Array<[string, string]>;
};

const DEFAULT_STORE_CATEGORY_SLUG_BY_PRODUCT_TYPE: Partial<
  Record<StoreProductCategory, string>
> = {
  'paint-kit': 'kits-pintura',
  'monthly-kit': 'kits-mes',
};

const VISIBILITY_REVALIDATE_SECONDS = 120;

export type StoreProductCategoryVisibilityRef = {
  storeCategoryId?: string | null;
  storeCategorySlug?: string | null;
  category?: StoreProductCategory;
};

function isCategoryVisible(
  categoryId: string,
  byId: Map<string, CategoryStatusRow>,
  cache: Map<string, boolean>
): boolean {
  if (cache.has(categoryId)) return cache.get(categoryId)!;

  const row = byId.get(categoryId);
  if (!row || !row.is_active) {
    cache.set(categoryId, false);
    return false;
  }

  if (row.parent_id) {
    const parentVisible = isCategoryVisible(row.parent_id, byId, cache);
    cache.set(categoryId, parentVisible);
    return parentVisible;
  }

  cache.set(categoryId, true);
  return true;
}

export function buildVisibleStoreCategoryIds(
  rows: CategoryStatusRow[]
): Set<string> {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const cache = new Map<string, boolean>();

  return new Set(
    rows
      .filter((row) => isCategoryVisible(row.id, byId, cache))
      .map((row) => row.id)
  );
}

async function loadStoreCategoryStatusRows(
  admin: SupabaseClient
): Promise<CategoryStatusRow[]> {
  const { data, error } = await admin
    .from('store_categories')
    .select('id, slug, parent_id, is_active');

  if (error) {
    console.error('[store] loadStoreCategoryStatusRows:', error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    parent_id: (row.parent_id as string | null) ?? null,
    is_active: Boolean(row.is_active),
  }));
}

function hydrateVisibility(
  cached: SerializableVisibility
): StoreCategoryVisibilityContext {
  return {
    visibleCategoryIds: new Set(cached.visibleCategoryIds),
    slugToId: new Map(cached.slugToId),
  };
}

async function fetchSerializableVisibility(): Promise<SerializableVisibility> {
  const admin = createAdminClient();
  const rows = await loadStoreCategoryStatusRows(admin);
  return {
    visibleCategoryIds: Array.from(buildVisibleStoreCategoryIds(rows)),
    slugToId: rows.map((row) => [row.slug, row.id]),
  };
}

/** Cache curto — invalidado junto com o catálogo da loja. */
export async function getCachedStoreCategoryVisibilityContext(): Promise<StoreCategoryVisibilityContext> {
  const cached = await unstable_cache(
    fetchSerializableVisibility,
    ['store-category-visibility'],
    {
      revalidate: VISIBILITY_REVALIDATE_SECONDS,
      tags: [STORE_CATALOG_CACHE_TAG],
    }
  )();

  return hydrateVisibility(cached);
}

export async function loadStoreCategoryVisibilityContext(
  _admin?: SupabaseClient
): Promise<StoreCategoryVisibilityContext> {
  return getCachedStoreCategoryVisibilityContext();
}

export async function loadVisibleStoreCategoryIds(
  admin: SupabaseClient
): Promise<Set<string>> {
  const context = await loadStoreCategoryVisibilityContext(admin);
  return context.visibleCategoryIds;
}

export function resolveStoreProductCategoryId(
  product: StoreProductCategoryVisibilityRef,
  slugToId: Map<string, string>
): string | null {
  if (product.storeCategoryId) return product.storeCategoryId;
  if (product.storeCategorySlug) {
    return slugToId.get(product.storeCategorySlug) ?? null;
  }

  if (product.category) {
    const defaultSlug = DEFAULT_STORE_CATEGORY_SLUG_BY_PRODUCT_TYPE[product.category];
    if (defaultSlug) {
      return slugToId.get(defaultSlug) ?? null;
    }
  }

  return null;
}

export function isStoreProductInVisibleCategory(
  storeCategoryId: string | null | undefined,
  visibleCategoryIds: Set<string>
): boolean {
  if (!storeCategoryId) return false;
  return visibleCategoryIds.has(storeCategoryId);
}

export function isStoreProductVisibleInVitrine(
  product: StoreProductCategoryVisibilityRef,
  context: StoreCategoryVisibilityContext
): boolean {
  const categoryId = resolveStoreProductCategoryId(product, context.slugToId);

  if (!categoryId) {
    // Itens avulsos sem categoria continuam visíveis.
    return product.category === 'store-item';
  }

  return isStoreProductInVisibleCategory(categoryId, context.visibleCategoryIds);
}

export function filterStoreProductsByVisibleCategory<
  T extends StoreProductCategoryVisibilityRef,
>(products: T[], context: StoreCategoryVisibilityContext): T[] {
  return products.filter((product) => isStoreProductVisibleInVitrine(product, context));
}

export function intersectCategoryIdsWithVisible(
  categoryIds: string[],
  visibleCategoryIds: Set<string>
): string[] {
  return categoryIds.filter((id) => visibleCategoryIds.has(id));
}
