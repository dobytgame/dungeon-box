'use client';

import { CookieConsentProvider } from '@/lib/cookies/CookieConsentProvider';
import CookieBanner from '@/components/legal/CookieBanner';
import CookiePreferencesModal from '@/components/legal/CookiePreferencesModal';
import PublicWhatsAppWidget from '@/components/marketing/PublicWhatsAppWidget';

export default function CookieConsentRoot({ children }: { children: React.ReactNode }) {
  return (
    <CookieConsentProvider>
      {children}
      <CookieBanner />
      <CookiePreferencesModal />
      <PublicWhatsAppWidget />
    </CookieConsentProvider>
  );
}
