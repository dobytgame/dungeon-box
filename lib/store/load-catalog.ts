import type { SupabaseClient } from '@supabase/supabase-js';
import { PAINT_KIT_BUMPS } from '@/lib/checkout/order-bumps';
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
  category: 'paint-kit' | 'monthly-kit';
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
  store_categories?: { slug: string; name: string } | { slug: string; name: string }[] | null;
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
    imageUrl: row.image_url ?? undefined,
    galleryUrls: row.gallery_urls ?? [],
    pageContentHtml: row.page_content_html ?? undefined,
    paintKitBumpId: row.paint_kit_bump_id ?? bump?.id,
    maxQuantity: row.max_quantity,
    planSlug: row.plan_slug ?? undefined,
  };
}

export async function loadActivePaintKitProducts(
  admin: SupabaseClient
): Promise<StoreProduct[]> {
  const { data, error } = await admin
    .from('store_products')
    .select('*, store_categories(slug, name)')
    .eq('category', 'paint-kit')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error || !data?.length) {
    return [...STORE_PRODUCTS];
  }

  return (data as DbStoreProductRow[]).map(mapDbRowToStoreProduct);
}

export async function getStoreProductBySlugFromDb(
  admin: SupabaseClient,
  slug: string
): Promise<StoreProduct | null> {
  const { data, error } = await admin
    .from('store_products')
    .select('*, store_categories(slug, name)')
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
