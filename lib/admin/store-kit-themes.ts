import type { SupabaseClient } from '@supabase/supabase-js';
import { loadStoreKitThemes, type StoreKitTheme } from '@/lib/store/kit-themes';

export type AdminStoreKitThemeRow = StoreKitTheme;

export async function listAdminStoreKitThemes(
  admin: SupabaseClient
): Promise<AdminStoreKitThemeRow[]> {
  return loadStoreKitThemes(admin);
}

export async function getAdminStoreKitTheme(
  admin: SupabaseClient,
  themeId: string
): Promise<AdminStoreKitThemeRow | null> {
  const { data, error } = await admin
    .from('store_kit_themes')
    .select('*')
    .eq('id', themeId)
    .maybeSingle();

  if (error) {
    console.error('[admin] getAdminStoreKitTheme:', error.message);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id as string,
    slug: data.slug as string,
    name: data.name as string,
    kitNumber: Number(data.kit_number),
    description: (data.description as string | null) ?? null,
    imageUrl: (data.image_url as string | null) ?? null,
    isActive: Boolean(data.is_active),
    sortOrder: Number(data.sort_order ?? 0),
  };
}
