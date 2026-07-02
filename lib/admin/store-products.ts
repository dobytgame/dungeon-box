import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoreProductCategory } from '@/lib/store/catalog';

export interface AdminStoreProductRow {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  category: StoreProductCategory;
  store_category_id: string | null;
  store_category_name: string | null;
  image_url: string | null;
  gallery_urls: string[];
  page_content_html: string | null;
  price_cents: number;
  production_cost_cents: number;
  includes: string[];
  paint_kit_bump_id: 'amador' | 'profissional' | null;
  plan_slug: string | null;
  plan_name: string | null;
  max_quantity: number;
  featured: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
}

export async function listAdminStoreProducts(
  admin: SupabaseClient
): Promise<AdminStoreProductRow[]> {
  const { data, error } = await admin
    .from('store_products')
    .select('*')
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[admin] listAdminStoreProducts:', error.message);
    return [];
  }

  const { data: plans } = await admin.from('plans').select('slug, name');
  const planNameBySlug = new Map(
    (plans ?? []).map((plan) => [plan.slug as string, plan.name as string])
  );

  const { data: categories } = await admin.from('store_categories').select('id, name');
  const categoryNameById = new Map(
    (categories ?? []).map((row) => [row.id as string, row.name as string])
  );

  return (data ?? []).map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    tagline: (row.tagline as string | null) ?? null,
    category: row.category as StoreProductCategory,
    store_category_id: (row.store_category_id as string | null) ?? null,
    store_category_name: row.store_category_id
      ? (categoryNameById.get(row.store_category_id as string) ?? null)
      : null,
    image_url: (row.image_url as string | null) ?? null,
    gallery_urls: (row.gallery_urls as string[] | null) ?? [],
    page_content_html: (row.page_content_html as string | null) ?? null,
    price_cents: row.price_cents as number,
    production_cost_cents: row.production_cost_cents as number,
    includes: (row.includes as string[] | null) ?? [],
    paint_kit_bump_id:
      (row.paint_kit_bump_id as 'amador' | 'profissional' | null) ?? null,
    plan_slug: (row.plan_slug as string | null) ?? null,
    plan_name: row.plan_slug
      ? (planNameBySlug.get(row.plan_slug as string) ?? null)
      : null,
    max_quantity: row.max_quantity as number,
    featured: Boolean(row.featured),
    is_active: Boolean(row.is_active),
    sort_order: row.sort_order as number,
    created_at: (row.created_at as string | null) ?? null,
  }));
}

export async function getAdminStoreProduct(
  admin: SupabaseClient,
  productId: string
): Promise<AdminStoreProductRow | null> {
  const rows = await listAdminStoreProducts(admin);
  return rows.find((row) => row.id === productId) ?? null;
}

export async function mergeMonthlyKitProductionCosts(
  admin: SupabaseClient,
  planProductionBySlug: Map<string, number>
): Promise<Map<string, number>> {
  const { data, error } = await admin
    .from('store_products')
    .select('plan_slug, production_cost_cents')
    .eq('category', 'monthly-kit');

  if (error) {
    return planProductionBySlug;
  }

  const merged = new Map(planProductionBySlug);
  for (const row of data ?? []) {
    const slug = row.plan_slug as string | null;
    const cost = row.production_cost_cents as number;
    if (slug && cost > 0) {
      merged.set(slug, cost);
    }
  }
  return merged;
}

export async function listActiveMonthlyKitPlanSlugs(
  admin: SupabaseClient
): Promise<Set<string>> {
  const { data, error } = await admin
    .from('store_products')
    .select('plan_slug')
    .eq('category', 'monthly-kit')
    .eq('is_active', true);

  if (error) {
    console.error('[admin] listActiveMonthlyKitPlanSlugs:', error.message);
    return new Set();
  }

  return new Set(
    (data ?? [])
      .map((row) => row.plan_slug as string | null)
      .filter((slug): slug is string => Boolean(slug))
  );
}
