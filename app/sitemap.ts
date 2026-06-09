import type { MetadataRoute } from 'next';
import { getCanonicalSiteUrl, INDEXABLE_ROUTES } from '@/lib/seo/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getCanonicalSiteUrl();
  const lastModified = new Date();

  return INDEXABLE_ROUTES.map((path) => ({
    url: path === '/' ? siteUrl : `${siteUrl}${path}`,
    lastModified,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.5,
  }));
}
