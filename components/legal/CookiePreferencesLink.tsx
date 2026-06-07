'use client';

import { openCookiePreferences } from '@/lib/cookies/CookieConsentProvider';

interface Props {
  className?: string;
  children?: React.ReactNode;
}

export default function CookiePreferencesLink({
  className = 'cursor-pointer text-sm text-stone-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember',
  children = 'Preferências de cookies',
}: Props) {
  return (
    <button type="button" onClick={openCookiePreferences} className={className}>
      {children}
    </button>
  );
}
