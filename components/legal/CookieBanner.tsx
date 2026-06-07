'use client';

import Link from 'next/link';
import { useCookieConsent } from '@/lib/cookies/CookieConsentProvider';

export default function CookieBanner() {
  const { isReady, showBanner, acceptAll, rejectOptional, openPreferences } = useCookieConsent();

  if (!isReady || !showBanner) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[90] border-t border-white/10 bg-stone-950/95 p-4 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md sm:p-5"
      role="region"
      aria-label="Aviso de cookies e privacidade"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="max-w-2xl">
          <p className="font-display text-xs uppercase tracking-[0.25em] text-frost">
            Cookies & LGPD
          </p>
          <p className="mt-2 text-sm leading-relaxed text-stone-300">
            Usamos cookies essenciais para login, checkout e segurança. Com sua permissão, também
            usamos cookies opcionais para melhorar o site e medir campanhas. Você pode aceitar,
            recusar o opcional ou personalizar. Leia nossa{' '}
            <Link href="/privacidade" className="text-ember underline-offset-2 hover:underline">
              Política de Privacidade
            </Link>{' '}
            e os{' '}
            <Link href="/termos" className="text-ember underline-offset-2 hover:underline">
              Termos de Uso
            </Link>
            .
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:shrink-0">
          <button
            type="button"
            onClick={openPreferences}
            className="min-h-[44px] cursor-pointer rounded-sm border border-white/15 px-4 py-2.5 text-sm text-stone-300 transition-colors duration-200 hover:border-white/25 hover:text-white"
          >
            Personalizar
          </button>
          <button
            type="button"
            onClick={rejectOptional}
            className="min-h-[44px] cursor-pointer rounded-sm border border-white/15 px-4 py-2.5 text-sm text-stone-300 transition-colors duration-200 hover:border-white/25 hover:text-white"
          >
            Recusar opcionais
          </button>
          <button
            type="button"
            onClick={acceptAll}
            className="min-h-[44px] cursor-pointer rounded-sm bg-ember px-5 py-2.5 font-display text-sm uppercase tracking-widest text-stone-950 transition-colors duration-200 hover:bg-ember-bright"
          >
            Aceitar todos
          </button>
        </div>
      </div>
    </div>
  );
}
