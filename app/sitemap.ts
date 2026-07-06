import type { MetadataRoute } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { getCanonicalSiteUrl, INDEXABLE_ROUTES } from '@/lib/seo/site';
import { isStorePublic } from '@/lib/store/access';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getCanonicalSiteUrl();
  const lastModified = new Date();
  const storePublic = isStorePublic();

  const indexableRoutes = storePublic
    ? INDEXABLE_ROUTES
    : INDEXABLE_ROUTES.filter((path) => path !== '/loja');

  const staticEntries: MetadataRoute.Sitemap = indexableRoutes.map((path) => ({
    url: path === '/' ? siteUrl : `${siteUrl}${path}`,
    lastModified,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : path === '/loja' ? 0.8 : 0.5,
  }));

  if (!storePublic) {
    return staticEntries;
  }

  const admin = createAdminClient();

  const [{ data: products }, { data: categories }] = await Promise.all([
    admin
      .from('store_products')
      .select('slug, updated_at')
      .eq('is_active', true),
    admin
      .from('store_categories')
      .select('slug, updated_at')
      .eq('is_active', true),
  ]);

  const categoryEntries: MetadataRoute.Sitemap = (categories ?? []).map((row) => ({
    url: `${siteUrl}/loja/${row.slug as string}`,
    lastModified: row.updated_at ? new Date(row.updated_at as string) : lastModified,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const productEntries: MetadataRoute.Sitemap = (products ?? []).map((row) => ({
    url: `${siteUrl}/loja/produto/${row.slug as string}`,
    lastModified: row.updated_at ? new Date(row.updated_at as string) : lastModified,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
