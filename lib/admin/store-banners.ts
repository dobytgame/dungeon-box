import type { SupabaseClient } from '@supabase/supabase-js';

export interface AdminStoreBannerRow {
  id: string;
  title: string;
  subtitle: string | null;
  cta_label: string | null;
  cta_href: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export async function listAdminStoreBanners(
  admin: SupabaseClient
): Promise<AdminStoreBannerRow[]> {
  const { data, error } = await admin
    .from('store_banners')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[admin] listAdminStoreBanners:', error.message);
    return [];
  }

  return (data ?? []) as AdminStoreBannerRow[];
}

export async function getAdminStoreBanner(
  admin: SupabaseClient,
  bannerId: string
): Promise<AdminStoreBannerRow | null> {
  const { data, error } = await admin
    .from('store_banners')
    .select('*')
    .eq('id', bannerId)
    .maybeSingle();

  if (error || !data) return null;
  return data as AdminStoreBannerRow;
}
