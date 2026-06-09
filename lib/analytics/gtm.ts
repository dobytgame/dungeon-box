import type { CookieConsentState } from '@/lib/cookies/consent';

export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? 'GTM-P6RGTX9W';

export function shouldLoadGtm(consent: CookieConsentState | null): boolean {
  if (!consent) return false;
  return consent.analytics || consent.marketing;
}

export function pushGtmConsentUpdate(consent: CookieConsentState): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({
    event: 'dungeonbox_consent_update',
    analytics_consent: consent.analytics ? 'granted' : 'denied',
    marketing_consent: consent.marketing ? 'granted' : 'denied',
  });
}
