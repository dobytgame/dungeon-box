'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import {
  COOKIE_CATEGORIES,
  type CookieCategory,
  DEFAULT_CONSENT,
} from '@/lib/cookies/consent';
import { useCookieConsent } from '@/lib/cookies/CookieConsentProvider';

export default function CookiePreferencesModal() {
  const { consent, showPreferences, closePreferences, savePreferences } = useCookieConsent();
  const [prefs, setPrefs] = useState({
    functional: consent?.functional ?? DEFAULT_CONSENT.functional,
    analytics: consent?.analytics ?? DEFAULT_CONSENT.analytics,
    marketing: consent?.marketing ?? DEFAULT_CONSENT.marketing,
  });

  useEffect(() => {
    if (showPreferences) {
      setPrefs({
        functional: consent?.functional ?? false,
        analytics: consent?.analytics ?? false,
        marketing: consent?.marketing ?? false,
      });
    }
  }, [showPreferences, consent]);

  useEffect(() => {
    if (!showPreferences) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePreferences();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [showPreferences, closePreferences]);

  if (!showPreferences) return null;

  const toggle = (key: Exclude<CookieCategory, 'essential'>) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-stone-950/80 backdrop-blur-sm"
        aria-label="Fechar preferências de cookies"
        onClick={closePreferences}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-modal-title"
        className="relative z-10 max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-sm border border-white/10 bg-stone-950 shadow-2xl sm:rounded-sm"
      >
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-white/[0.06] bg-stone-950/95 px-5 py-4 backdrop-blur-sm">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.3em] text-frost">
              Privacidade
            </p>
            <h2
              id="cookie-modal-title"
              className="mt-1 font-display text-2xl uppercase tracking-wide text-white"
            >
              Preferências de cookies
            </h2>
          </div>
          <button
            type="button"
            onClick={closePreferences}
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-white/10 text-stone-400 transition-colors hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <p className="text-sm leading-relaxed text-stone-400">
            Você controla cookies opcionais. Essenciais permanecem ativos para login, checkout e
            segurança. Saiba mais na{' '}
            <Link href="/privacidade" className="text-ember hover:underline" onClick={closePreferences}>
              Política de Privacidade
            </Link>
            .
          </p>

          {COOKIE_CATEGORIES.map((cat) => {
            const isRequired = cat.required;
            const key = cat.id as Exclude<CookieCategory, 'essential'>;
            const checked = isRequired ? true : prefs[key];

            return (
              <div
                key={cat.id}
                className="rounded-sm border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-white">{cat.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-stone-500">{cat.description}</p>
                  </div>
                  <label
                    className={`inline-flex shrink-0 items-center gap-2 ${isRequired ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded-sm border-white/30 bg-stone-900 text-ember focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:cursor-not-allowed"
                      checked={checked}
                      disabled={isRequired}
                      onChange={() => !isRequired && toggle(key)}
                      aria-label={`${cat.label}${isRequired ? ' (obrigatório)' : ''}`}
                    />
                  </label>
                </div>
                {isRequired ? (
                  <p className="mt-2 text-[0.65rem] uppercase tracking-wider text-stone-600">
                    Sempre ativo
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 border-t border-white/[0.06] px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closePreferences}
            className="min-h-[44px] cursor-pointer rounded-sm border border-white/15 px-4 py-2.5 text-sm text-stone-300 transition-colors hover:border-white/25 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => savePreferences(prefs)}
            className="min-h-[44px] cursor-pointer rounded-sm bg-ember px-5 py-2.5 font-display text-sm uppercase tracking-widest text-stone-950 transition-colors hover:bg-ember-bright"
          >
            Salvar preferências
          </button>
        </div>
      </div>
    </div>
  );
}
