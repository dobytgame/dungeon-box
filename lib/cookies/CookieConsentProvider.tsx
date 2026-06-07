'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  acceptAllConsent,
  applyConsentSideEffects,
  type CookieConsentState,
  readConsent,
  rejectOptionalConsent,
  writeConsent,
} from '@/lib/cookies/consent';

interface CookieConsentContextValue {
  consent: CookieConsentState | null;
  isReady: boolean;
  showBanner: boolean;
  showPreferences: boolean;
  acceptAll: () => void;
  rejectOptional: () => void;
  savePreferences: (prefs: {
    functional: boolean;
    analytics: boolean;
    marketing: boolean;
  }) => void;
  openPreferences: () => void;
  closePreferences: () => void;
  dismissBanner: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<CookieConsentState | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  const syncConsent = useCallback((next: CookieConsentState | null) => {
    setConsent(next);
    if (next) {
      applyConsentSideEffects(next);
      setShowBanner(false);
    }
  }, []);

  useEffect(() => {
    const stored = readConsent();
    syncConsent(stored);
    setShowBanner(!stored);
    setIsReady(true);

    const onConsentChange = (e: Event) => {
      const detail = (e as CustomEvent<CookieConsentState>).detail;
      if (detail) syncConsent(detail);
    };
    const onOpenPreferences = () => {
      setShowPreferences(true);
      setShowBanner(false);
    };

    window.addEventListener('dungeonbox:consent-change', onConsentChange);
    window.addEventListener('dungeonbox:open-cookie-preferences', onOpenPreferences);

    return () => {
      window.removeEventListener('dungeonbox:consent-change', onConsentChange);
      window.removeEventListener('dungeonbox:open-cookie-preferences', onOpenPreferences);
    };
  }, [syncConsent]);

  const acceptAll = useCallback(() => {
    syncConsent(acceptAllConsent());
  }, [syncConsent]);

  const rejectOptional = useCallback(() => {
    syncConsent(rejectOptionalConsent());
  }, [syncConsent]);

  const savePreferences = useCallback(
    (prefs: { functional: boolean; analytics: boolean; marketing: boolean }) => {
      syncConsent(writeConsent(prefs));
      setShowPreferences(false);
    },
    [syncConsent]
  );

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      isReady,
      showBanner,
      showPreferences,
      acceptAll,
      rejectOptional,
      savePreferences,
      openPreferences: () => setShowPreferences(true),
      closePreferences: () => setShowPreferences(false),
      dismissBanner: () => setShowBanner(false),
    }),
    [
      consent,
      isReady,
      showBanner,
      showPreferences,
      acceptAll,
      rejectOptional,
      savePreferences,
    ]
  );

  return (
    <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error('useCookieConsent must be used within CookieConsentProvider');
  }
  return ctx;
}

/** Abre o modal de preferências de qualquer lugar (ex.: footer). */
export function openCookiePreferences() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dungeonbox:open-cookie-preferences'));
  }
}
