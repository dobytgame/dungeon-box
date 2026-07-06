import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildCategoryTree,
  flattenCategoryTree,
} from '@/lib/store/category-tree';

export interface AdminStoreCategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  banner_url: string | null;
  thumb_url: string | null;
  parent_id: string | null;
  parent_name: string | null;
  sort_order: number;
  is_active: boolean;
  product_count: number;
  created_at: string | null;
}

export interface AdminStoreCategoryOption {
  id: string;
  name: string;
  depth: number;
  parentName: string | null;
}

function mapCategoryRow(
  row: Record<string, unknown>,
  productCount = 0,
  parentName: string | null = null
): AdminStoreCategoryRow {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    banner_url: (row.banner_url as string | null) ?? null,
    thumb_url: (row.thumb_url as string | null) ?? null,
    parent_id: (row.parent_id as string | null) ?? null,
    parent_name: parentName,
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

  const nameById = new Map(
    (data ?? []).map((row) => [row.id as string, row.name as string])
  );

  return (data ?? []).map((row) =>
    mapCategoryRow(
      row as Record<string, unknown>,
      countByCategory.get(row.id as string) ?? 0,
      row.parent_id ? (nameById.get(row.parent_id as string) ?? null) : null
    )
  );
}

export async function listAdminStoreCategoryOptions(
  admin: SupabaseClient
): Promise<AdminStoreCategoryOption[]> {
  const categories = await listAdminStoreCategories(admin);
  const tree = buildCategoryTree(
    categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      parent_id: category.parent_id,
    }))
  );

  return flattenCategoryTree(tree).map((node) => ({
    id: node.id,
    name: node.name,
    depth: node.depth,
    parentName:
      node.parentId != null
        ? (categories.find((category) => category.id === node.parentId)?.name ??
          null)
        : null,
  }));
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

  const [{ count }, parentRow] = await Promise.all([
    admin
      .from('store_products')
      .select('id', { count: 'exact', head: true })
      .eq('store_category_id', categoryId),
    data.parent_id
      ? admin
          .from('store_categories')
          .select('name')
          .eq('id', data.parent_id as string)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return mapCategoryRow(
    data as Record<string, unknown>,
    count ?? 0,
    (parentRow.data?.name as string | null) ?? null
  );
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
