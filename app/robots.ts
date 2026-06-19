import type { MetadataRoute } from 'next';
import { getCanonicalSiteUrl, shouldIndexSite } from '@/lib/seo/site';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getCanonicalSiteUrl();

  if (!shouldIndexSite()) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    };
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/auth/', '/checkout/', '/dashboard/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
