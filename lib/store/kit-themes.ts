import type { SupabaseClient } from '@supabase/supabase-js';

export type StoreKitTheme = {
  id: string;
  slug: string;
  name: string;
  kitNumber: number;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
};

export function formatStoreKitThemeLabel(theme: {
  kitNumber: number;
  name: string;
}): string {
  return `Kit ${theme.kitNumber} · ${theme.name}`;
}

export function formatMonthlyKitLineName(
  planName: string,
  theme?: { kitNumber: number; name: string } | null
): string {
  const base = `Kit do mês — ${planName}`;
  if (!theme?.name) return base;
  if (!theme.kitNumber) return `${base} · ${theme.name}`;
  return `${base} · ${formatStoreKitThemeLabel(theme)}`;
}

function mapStoreKitThemeRow(row: Record<string, unknown>): StoreKitTheme {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    kitNumber: Number(row.kit_number),
    description: (row.description as string | null) ?? null,
    imageUrl: (row.image_url as string | null) ?? null,
    isActive: Boolean(row.is_active),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

export async function loadStoreKitThemes(
  admin: SupabaseClient,
  options?: { activeOnly?: boolean }
): Promise<StoreKitTheme[]> {
  let query = admin
    .from('store_kit_themes')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('kit_number', { ascending: true });

  if (options?.activeOnly) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[store] loadStoreKitThemes:', error.message);
    return [];
  }

  return (data ?? []).map((row) =>
    mapStoreKitThemeRow(row as Record<string, unknown>)
  );
}

export async function loadActiveStoreKitThemes(
  admin: SupabaseClient
): Promise<StoreKitTheme[]> {
  return loadStoreKitThemes(admin, { activeOnly: true });
}

export async function getStoreKitThemeById(
  admin: SupabaseClient,
  themeId: string
): Promise<StoreKitTheme | null> {
  const { data, error } = await admin
    .from('store_kit_themes')
    .select('*')
    .eq('id', themeId)
    .maybeSingle();

  if (error) {
    console.error('[store] getStoreKitThemeById:', error.message);
    return null;
  }

  return data ? mapStoreKitThemeRow(data as Record<string, unknown>) : null;
}

export function findStoreKitTheme(
  themes: StoreKitTheme[],
  themeId?: string | null
): StoreKitTheme | null {
  if (!themeId) return null;
  return themes.find((theme) => theme.id === themeId) ?? null;
}
