import type { SupabaseClient } from '@supabase/supabase-js';

export interface AdminStoreCategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  product_count: number;
  created_at: string | null;
}

function mapCategoryRow(
  row: Record<string, unknown>,
  productCount = 0
): AdminStoreCategoryRow {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    sort_order: row.sort_order as number,
    is_active: Boolean(row.is_active),
    product_count: productCount,
    created_at: (row.created_at as string | null) ?? null,
  };
}

export async function listAdminStoreCategories(
  admin: SupabaseClient
): Promise<AdminStoreCategoryRow[]> {
  const [{ data, error }, { data: productCounts }] = await Promise.all([
    admin
      .from('store_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true }),
    admin.from('store_products').select('store_category_id'),
  ]);

  if (error) {
    console.error('[admin] listAdminStoreCategories:', error.message);
    return [];
  }

  const countByCategory = new Map<string, number>();
  for (const row of productCounts ?? []) {
    const categoryId = row.store_category_id as string | null;
    if (!categoryId) continue;
    countByCategory.set(categoryId, (countByCategory.get(categoryId) ?? 0) + 1);
  }

  return (data ?? []).map((row) =>
    mapCategoryRow(row as Record<string, unknown>, countByCategory.get(row.id as string) ?? 0)
  );
}

export async function getAdminStoreCategory(
  admin: SupabaseClient,
  categoryId: string
): Promise<AdminStoreCategoryRow | null> {
  const { data, error } = await admin
    .from('store_categories')
    .select('*')
    .eq('id', categoryId)
    .maybeSingle();

  if (error || !data) return null;

  const { count } = await admin
    .from('store_products')
    .select('id', { count: 'exact', head: true })
    .eq('store_category_id', categoryId);

  return mapCategoryRow(data as Record<string, unknown>, count ?? 0);
}

export async function listActiveStoreCategories(
  admin: SupabaseClient
): Promise<Array<{ id: string; name: string; slug: string }>> {
  const { data, error } = await admin
    .from('store_categories')
    .select('id, name, slug')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) return [];
  return (data ?? []) as Array<{ id: string; name: string; slug: string }>;
}
