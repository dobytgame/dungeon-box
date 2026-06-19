import type { CookieConsentState } from '@/lib/cookies/consent';

export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? 'GTM-P6RGTX9W';

export function shouldLoadGtm(consent: CookieConsentState | null): boolean {
  if (!consent) return false;
  return consent.analytics || consent.marketing;
}

export function pushGtmConsentUpdate(consent: CookieConsentState): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer ?? [];

  const analytics = consent.analytics ? 'granted' : 'denied';
  const marketing = consent.marketing ? 'granted' : 'denied';

  window.dataLayer.push({
    event: 'consent_update',
    analytics_storage: analytics,
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: marketing,
    functionality_storage: consent.functional ? 'granted' : 'denied',
    personalization_storage: consent.functional ? 'granted' : 'denied',
    security_storage: 'granted',
  });

  window.dataLayer.push({
    event: 'dungeonbox_consent_update',
    analytics_consent: analytics,
    marketing_consent: marketing,
  });
}
