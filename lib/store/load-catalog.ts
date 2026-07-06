import type { SupabaseClient } from '@supabase/supabase-js';
import { PAINT_KIT_BUMPS } from '@/lib/checkout/order-bumps';
import { collectDescendantCategoryIds } from '@/lib/store/category-tree';
import type { StoreSortOption } from '@/lib/store/sort';
import { STORE_PAGE_SIZE } from '@/lib/store/sort';
import {
  STORE_PRODUCTS,
  type StoreCatalogProductId,
  type StoreProduct,
} from '@/lib/store/catalog';

export interface DbStoreProductRow {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  category: 'paint-kit' | 'monthly-kit' | 'store-item';
  store_category_id: string | null;
  image_url: string | null;
  gallery_urls: string[] | null;
  page_content_html: string | null;
  price_cents: number;
  production_cost_cents: number;
  includes: string[] | null;
  paint_kit_bump_id: 'amador' | 'profissional' | null;
  plan_slug: string | null;
  max_quantity: number;
  featured: boolean;
  is_active: boolean;
  sort_order: number;
  store_categories?: {
    slug: string;
    name: string;
    parent_id?: string | null;
    parent?: { slug: string; name: string } | { slug: string; name: string }[] | null;
  } | {
    slug: string;
    name: string;
    parent_id?: string | null;
    parent?: { slug: string; name: string } | { slug: string; name: string }[] | null;
  }[] | null;
}

function formatPriceLabel(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function mapDbRowToStoreProduct(row: DbStoreProductRow): StoreProduct {
  const includes = row.includes ?? [];
  const bump = row.paint_kit_bump_id
    ? PAINT_KIT_BUMPS.find((entry) => entry.id === row.paint_kit_bump_id)
    : undefined;
  const storeCategory = Array.isArray(row.store_categories)
    ? row.store_categories[0]
    : row.store_categories;
  const parentCategory = storeCategory?.parent
    ? Array.isArray(storeCategory.parent)
      ? storeCategory.parent[0]
      : storeCategory.parent
    : undefined;

  return {
    id: row.slug === 'kit-pintura-amador' || row.slug === 'kit-pintura-profissional'
      ? (row.slug === 'kit-pintura-amador'
          ? 'paint-kit-amador'
          : 'paint-kit-profissional')
      : row.slug,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline ?? '',
    priceCents: row.price_cents,
    priceLabel: formatPriceLabel(row.price_cents),
    includes,
    featured: row.featured,
    category: row.category,
    storeCategorySlug: storeCategory?.slug,
    storeCategoryName: storeCategory?.name,
    storeParentCategorySlug: parentCategory?.slug,
    storeParentCategoryName: parentCategory?.name,
    imageUrl: row.image_url ?? undefined,
    galleryUrls: row.gallery_urls ?? [],
    pageContentHtml: row.page_content_html ?? undefined,
    paintKitBumpId: row.paint_kit_bump_id ?? bump?.id,
    maxQuantity: row.max_quantity,
    planSlug: row.plan_slug ?? undefined,
  };
}

const PRODUCT_CATEGORY_SELECT =
  '*, store_categories(slug, name, parent_id, parent:parent_id(slug, name))';

export async function loadActivePaintKitProducts(
  admin: SupabaseClient
): Promise<StoreProduct[]> {
  const { data, error } = await admin
    .from('store_products')
    .select(PRODUCT_CATEGORY_SELECT)
    .eq('category', 'paint-kit')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error || !data?.length) {
    return [...STORE_PRODUCTS];
  }

  return (data as DbStoreProductRow[]).map(mapDbRowToStoreProduct);
}

export async function loadAllActiveStoreProducts(
  admin: SupabaseClient
): Promise<StoreProduct[]> {
  const { data, error } = await admin
    .from('store_products')
    .select(PRODUCT_CATEGORY_SELECT)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error || !data?.length) return [...STORE_PRODUCTS];
  return (data as DbStoreProductRow[]).map(mapDbRowToStoreProduct);
}

export async function getStoreProductBySlugFromDb(
  admin: SupabaseClient,
  slug: string
): Promise<StoreProduct | null> {
  const { data, error } = await admin
    .from('store_products')
    .select(PRODUCT_CATEGORY_SELECT)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;
  return mapDbRowToStoreProduct(data as DbStoreProductRow);
}

export async function getStoreProductProductionCostCents(
  admin: SupabaseClient,
  productId: string
): Promise<number | null> {
  const { data } = await admin
    .from('store_products')
    .select('production_cost_cents, slug, paint_kit_bump_id')
    .or(
      `slug.eq.${productId},paint_kit_bump_id.eq.${productId.replace('paint-kit-', '')}`
    )
    .maybeSingle();

  if (!data) return null;
  return (data.production_cost_cents as number) ?? 0;
}

export function getStaticStoreProduct(id: StoreCatalogProductId): StoreProduct | undefined {
  return STORE_PRODUCTS.find((product) => product.id === id);
}

export type StoreCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  bannerUrl: string | null;
  thumbUrl: string | null;
  parentId: string | null;
  parentSlug: string | null;
  parentName: string | null;
};

type DbStoreCategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  banner_url?: string | null;
  thumb_url?: string | null;
  parent_id: string | null;
  parent?: { slug: string; name: string } | { slug: string; name: string }[] | null;
};

function mapStoreCategoryRow(row: DbStoreCategoryRow): StoreCategory {
  const parent = Array.isArray(row.parent) ? row.parent[0] : row.parent;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    bannerUrl: row.banner_url ?? null,
    thumbUrl: row.thumb_url ?? null,
    parentId: row.parent_id,
    parentSlug: parent?.slug ?? null,
    parentName: parent?.name ?? null,
  };
}

const CATEGORY_SELECT =
  'id, slug, name, description, banner_url, thumb_url, parent_id, parent:parent_id(slug, name)';

async function loadAllActiveCategoryRows(
  admin: SupabaseClient
): Promise<DbStoreCategoryRow[]> {
  const { data, error } = await admin
    .from('store_categories')
    .select(CATEGORY_SELECT)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error || !data?.length) return [];
  return data as DbStoreCategoryRow[];
}

export async function loadActiveStoreCategories(
  admin: SupabaseClient
): Promise<StoreCategory[]> {
  const rows = await loadAllActiveCategoryRows(admin);
  return rows.filter((row) => !row.parent_id).map(mapStoreCategoryRow);
}

export async function loadActiveStoreSubcategories(
  admin: SupabaseClient,
  parentCategoryId: string
): Promise<StoreCategory[]> {
  const rows = await loadAllActiveCategoryRows(admin);
  return rows
    .filter((row) => row.parent_id === parentCategoryId)
    .map(mapStoreCategoryRow);
}

export async function getStoreCategoryBySlug(
  admin: SupabaseClient,
  slug: string
): Promise<StoreCategory | null> {
  const { data, error } = await admin
    .from('store_categories')
    .select(CATEGORY_SELECT)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;
  return mapStoreCategoryRow(data as DbStoreCategoryRow);
}

export async function loadActiveProductsByCategory(
  admin: SupabaseClient,
  categorySlug: string,
  options?: {
    sort?: StoreSortOption;
    page?: number;
    pageSize?: number;
  }
): Promise<{
  category: StoreCategory | null;
  products: StoreProduct[];
  total: number;
}> {
  const sort = options?.sort ?? 'novidades';
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? STORE_PAGE_SIZE;

  const { data: categoryRow, error: categoryError } = await admin
    .from('store_categories')
    .select(CATEGORY_SELECT)
    .eq('slug', categorySlug)
    .eq('is_active', true)
    .maybeSingle();

  if (categoryError || !categoryRow) {
    return { category: null, products: [], total: 0 };
  }

  const category = mapStoreCategoryRow(categoryRow as DbStoreCategoryRow);
  const allCategoryRows = await loadAllActiveCategoryRows(admin);
  const categoryIds = collectDescendantCategoryIds(
    category.id,
    allCategoryRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      parent_id: row.parent_id,
    }))
  );

  const orderColumn =
    sort === 'menor-preco' || sort === 'maior-preco' ? 'price_cents' : 'created_at';
  const ascending = sort === 'menor-preco';

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await admin
    .from('store_products')
    .select(PRODUCT_CATEGORY_SELECT, { count: 'exact' })
    .eq('is_active', true)
    .in('store_category_id', categoryIds)
    .order(orderColumn, { ascending })
    .range(from, to);

  if (error || !data?.length) {
    return { category, products: [], total: count ?? 0 };
  }

  return {
    category,
    products: (data as DbStoreProductRow[]).map(mapDbRowToStoreProduct),
    total: count ?? data.length,
  };
}

export async function loadFeaturedProducts(
  admin: SupabaseClient
): Promise<StoreProduct[]> {
  const { data, error } = await admin
    .from('store_products')
    .select(PRODUCT_CATEGORY_SELECT)
    .eq('is_active', true)
    .eq('featured', true)
    .order('sort_order', { ascending: true })
    .limit(8);

  if (error || !data?.length) return [];
  return (data as DbStoreProductRow[]).map(mapDbRowToStoreProduct);
}

export async function loadNewestProducts(
  admin: SupabaseClient,
  limit = 8
): Promise<StoreProduct[]> {
  const { data, error } = await admin
    .from('store_products')
    .select(PRODUCT_CATEGORY_SELECT)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data?.length) return [];
  return (data as DbStoreProductRow[]).map(mapDbRowToStoreProduct);
}

export async function loadRelatedProducts(
  admin: SupabaseClient,
  product: StoreProduct,
  limit = 4
): Promise<StoreProduct[]> {
  if (!product.storeCategorySlug) return [];

  const category = await getStoreCategoryBySlug(admin, product.storeCategorySlug);
  if (!category) return [];

  const allCategoryRows = await loadAllActiveCategoryRows(admin);
  const categoryIds = collectDescendantCategoryIds(
    category.id,
    allCategoryRows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      parent_id: row.parent_id,
    }))
  );

  const { data, error } = await admin
    .from('store_products')
    .select(PRODUCT_CATEGORY_SELECT)
    .eq('is_active', true)
    .in('store_category_id', categoryIds)
    .neq('slug', product.slug)
    .order('featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .limit(limit);

  if (error || !data?.length) return [];
  return (data as DbStoreProductRow[]).map(mapDbRowToStoreProduct);
}
