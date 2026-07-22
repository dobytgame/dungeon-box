import { getSiteUrl } from '@/lib/email/config';

export interface MarketingUtmOptions {
  campaign: string;
  medium?: string;
  content?: string;
  source?: string;
}

export function buildMarketingCampaignUrl(
  path: string,
  options: MarketingUtmOptions
): string {
  const base = path.startsWith('http')
    ? path
    : `${getSiteUrl()}${path.startsWith('/') ? path : `/${path}`}`;

  const url = new URL(base);
  url.searchParams.set('utm_source', options.source ?? 'email');
  url.searchParams.set('utm_medium', options.medium ?? 'marketing');
  url.searchParams.set('utm_campaign', options.campaign);
  if (options.content) {
    url.searchParams.set('utm_content', options.content);
  }

  return url.toString();
}
