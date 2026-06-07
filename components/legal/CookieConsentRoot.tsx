'use client';

import { CookieConsentProvider } from '@/lib/cookies/CookieConsentProvider';
import CookieBanner from '@/components/legal/CookieBanner';
import CookiePreferencesModal from '@/components/legal/CookiePreferencesModal';

export default function CookieConsentRoot({ children }: { children: React.ReactNode }) {
  return (
    <CookieConsentProvider>
      {children}
      <CookieBanner />
      <CookiePreferencesModal />
    </CookieConsentProvider>
  );
}
