'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import CTAButton from '@/components/ui/CTAButton';
import { siteNavLinkClassName } from '@/lib/ui/site-nav';

const DEFAULT_LINKS = [
  { href: '#planos', label: 'Planos' },
  { href: '#fidelidade', label: 'Fidelidade' },
  { href: '#temas', label: 'Temas' },
  { href: '#faq', label: 'FAQ' },
] as const;

export type MobileNavLink = { href: string; label: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoggedIn?: boolean;
  userName?: string | null;
  links?: readonly MobileNavLink[];
  ctaLabel?: string;
  ctaHref?: string;
  ctaExternal?: boolean;
  showAuthLink?: boolean;
}

export function MobileNavToggle({
  open,
  onOpenChange,
}: Pick<Props, 'open' | 'onOpenChange'>) {
  return (
    <button
      type="button"
      className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-white/10 text-stone-300 transition-colors duration-200 hover:border-white/20 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember md:hidden"
      aria-expanded={open}
      aria-controls="mobile-nav-panel"
      aria-label={open ? 'Fechar menu' : 'Abrir menu'}
      onClick={() => onOpenChange(!open)}
    >
      {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
    </button>
  );
}

export default function MobileNavPanel({
  open,
  onOpenChange,
  isLoggedIn = false,
  userName,
  links = DEFAULT_LINKS,
  ctaLabel,
  ctaHref,
  ctaExternal = false,
  showAuthLink = true,
}: Props) {
  const primaryCtaLabel =
    ctaLabel ?? (isLoggedIn ? 'Ir para o dashboard' : 'Assinar agora');
  const primaryCtaHref =
    ctaHref ?? (isLoggedIn ? '/dashboard' : '/checkout?plan=heroi');

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-mobile-nav-backdrop)] md:hidden" aria-hidden={false}>
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-stone-950/85 backdrop-blur-sm"
        aria-label="Fechar menu"
        onClick={() => onOpenChange(false)}
      />
      <div
        id="mobile-nav-panel"
        className="absolute inset-x-3 top-[calc(var(--site-header-offset)+0.375rem)] z-[var(--z-mobile-nav-panel)] max-h-[calc(100dvh-var(--site-header-offset)-1rem)] overflow-y-auto rounded-sm border border-white/10 bg-stone-950/98 shadow-2xl backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
      >
        <nav className="flex flex-col p-4" aria-label="Navegação mobile">
          <ul className="divide-y divide-white/[0.06]">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => onOpenChange(false)}
                  className={`flex min-h-[48px] cursor-pointer items-center text-stone-300 transition-colors duration-200 hover:text-white ${siteNavLinkClassName}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            {showAuthLink ? (
              <li>
                <Link
                  href={isLoggedIn ? '/dashboard' : '/auth'}
                  onClick={() => onOpenChange(false)}
                  className={`flex min-h-[48px] cursor-pointer items-center text-stone-400 transition-colors duration-200 hover:text-white ${siteNavLinkClassName}`}
                >
                  {isLoggedIn
                    ? userName
                      ? `Minha conta · ${userName.split(' ')[0]}`
                      : 'Minha conta'
                    : 'Entrar'}
                </Link>
              </li>
            ) : null}
          </ul>
          <div className="mt-4 pt-2">
            <CTAButton
              label={primaryCtaLabel}
              size="md"
              href={primaryCtaHref}
              external={ctaExternal}
              trackingLocation="mobile_nav"
              className="w-full"
            />
          </div>
        </nav>
      </div>
    </div>
  );
}
