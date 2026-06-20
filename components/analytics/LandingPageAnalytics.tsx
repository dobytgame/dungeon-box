'use client';

import { useEffect } from 'react';
import { plans } from '@/lib/data';
import { trackViewItemList } from '@/lib/analytics/data-layer';
import type { CookieConsentState } from '@/lib/cookies/consent';

function fireViewItemList(): void {
  trackViewItemList(
    plans.map((plan) => ({
      item_id: plan.id,
      item_name: `Plano ${plan.name}`,
      price: plan.price,
    }))
  );
}

function hasTrackingConsent(consent: CookieConsentState): boolean {
  return consent.analytics || consent.marketing;
}

export default function LandingPageAnalytics() {
  useEffect(() => {
    fireViewItemList();

    const onConsentChange = (event: Event) => {
      const consent = (event as CustomEvent<CookieConsentState>).detail;
      if (consent && hasTrackingConsent(consent)) {
        fireViewItemList();
      }
    };

    window.addEventListener('dungeonbox:consent-change', onConsentChange);
    return () => {
      window.removeEventListener('dungeonbox:consent-change', onConsentChange);
    };
  }, []);

  return null;
}
