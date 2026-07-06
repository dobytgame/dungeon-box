import type { SupabaseClient } from '@supabase/supabase-js';

export type StoreBanner = {
  id: string;
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageUrl: string | null;
};

type DbStoreBannerRow = {
  id: string;
  title: string;
  subtitle: string | null;
  cta_label: string | null;
  cta_href: string | null;
  image_url: string | null;
};

function mapBanner(row: DbStoreBannerRow): StoreBanner {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    ctaLabel: row.cta_label,
    ctaHref: row.cta_href,
    imageUrl: row.image_url,
  };
}

export async function loadActiveStoreBanners(
  admin: SupabaseClient
): Promise<StoreBanner[]> {
  const { data, error } = await admin
    .from('store_banners')
    .select('id, title, subtitle, cta_label, cta_href, image_url')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error || !data?.length) return [];
  return (data as DbStoreBannerRow[]).map(mapBanner);
}
