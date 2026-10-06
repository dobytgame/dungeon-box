import type { MarketingAttributionInput } from '@/lib/marketing/attribution';

export const UTM_STORAGE_KEY = 'dbx_utm_params';
const FBCLID_STORAGE_KEY = 'dbx_fbclid';

export function captureMarketingAttributionFromSearch(
  search: string,
  pathname: string
): void {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const utm: MarketingAttributionInput = {
    utmSource: params.get('utm_source'),
    utmMedium: params.get('utm_medium'),
    utmCampaign: params.get('utm_campaign'),
    utmContent: params.get('utm_content'),
    utmTerm: params.get('utm_term'),
    fbclid: params.get('fbclid'),
    capturedAt: new Date().toISOString(),
    landingPath: pathname,
  };

  const hasUtm = Object.entries(utm).some(
    ([key, value]) =>
      key !== 'capturedAt' &&
      key !== 'landingPath' &&
      typeof value === 'string' &&
      value.trim().length > 0
  );

  if (hasUtm) {
    sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
  }

  const fbclid = params.get('fbclid')?.trim();
  if (fbclid) {
    sessionStorage.setItem(FBCLID_STORAGE_KEY, fbclid);
  }
}

export function readStoredMarketingAttribution(): MarketingAttributionInput | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as MarketingAttributionInput;
      if (parsed && typeof parsed === 'object') {
        if (!parsed.fbclid?.trim()) {
          const fbclid = sessionStorage.getItem(FBCLID_STORAGE_KEY);
          if (fbclid) parsed.fbclid = fbclid;
        }
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }

  const fbclid = sessionStorage.getItem(FBCLID_STORAGE_KEY);
  if (fbclid) {
    return {
      fbclid,
      capturedAt: new Date().toISOString(),
    };
  }

  return null;
}
