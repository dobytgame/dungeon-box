import { pushGtmConsentUpdate } from '@/lib/analytics/gtm';

export const CONSENT_STORAGE_KEY = 'dungeonbox_cookie_consent';

/** Incrementar quando categorias ou política de cookies mudar. */
export const CONSENT_VERSION = '1.0';

export type CookieCategory = 'essential' | 'functional' | 'analytics' | 'marketing';

export interface CookieConsentState {
  version: string;
  essential: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

export const DEFAULT_CONSENT: CookieConsentState = {
  version: CONSENT_VERSION,
  essential: true,
  functional: false,
  analytics: false,
  marketing: false,
  updatedAt: '',
};

export const ACCEPT_ALL_CONSENT: Omit<CookieConsentState, 'updatedAt'> = {
  version: CONSENT_VERSION,
  essential: true,
  functional: true,
  analytics: true,
  marketing: true,
};

export const ESSENTIAL_ONLY_CONSENT: Omit<CookieConsentState, 'updatedAt'> = {
  version: CONSENT_VERSION,
  essential: true,
  functional: false,
  analytics: false,
  marketing: false,
};

export const COOKIE_CATEGORIES: {
  id: CookieCategory;
  label: string;
  description: string;
  required?: boolean;
}[] = [
  {
    id: 'essential',
    label: 'Essenciais',
    description:
      'Necessários para login, checkout, segurança e guardar sua escolha de cookies. Sem eles o site não funciona corretamente.',
    required: true,
  },
  {
    id: 'functional',
    label: 'Funcionais',
    description:
      'Lembram preferências da interface e melhoram a experiência, sem identificar você para fins de marketing.',
  },
  {
    id: 'analytics',
    label: 'Analíticos',
    description:
      'Ajudam a entender como o site é usado (páginas visitadas, erros) para melhorar o produto. Dados agregados quando possível.',
  },
  {
    id: 'marketing',
    label: 'Marketing',
    description:
      'Permitem medir campanhas e exibir conteúdo relevante em outros canais. Só ativamos com seu consentimento.',
  },
];

function isValidConsent(value: unknown): value is CookieConsentState {
  if (!value || typeof value !== 'object') return false;
  const v = value as CookieConsentState;
  return (
    v.version === CONSENT_VERSION &&
    v.essential === true &&
    typeof v.functional === 'boolean' &&
    typeof v.analytics === 'boolean' &&
    typeof v.marketing === 'boolean' &&
    typeof v.updatedAt === 'string'
  );
}

export function readConsent(): CookieConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidConsent(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeConsent(partial: {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}): CookieConsentState {
  const state: CookieConsentState = {
    version: CONSENT_VERSION,
    essential: true,
    functional: partial.functional,
    analytics: partial.analytics,
    marketing: partial.marketing,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('dungeonbox:consent-change', { detail: state }));
  }
  return state;
}

export function acceptAllConsent(): CookieConsentState {
  return writeConsent(ACCEPT_ALL_CONSENT);
}

export function rejectOptionalConsent(): CookieConsentState {
  return writeConsent(ESSENTIAL_ONLY_CONSENT);
}

export function hasCategoryConsent(
  consent: CookieConsentState | null,
  category: CookieCategory
): boolean {
  if (!consent) return category === 'essential';
  if (category === 'essential') return true;
  return consent[category];
}

/** Dispara scripts de terceiros somente após consentimento (analytics/marketing). */
export function applyConsentSideEffects(consent: CookieConsentState): void {
  if (typeof window === 'undefined') return;
  pushGtmConsentUpdate(consent);
}
