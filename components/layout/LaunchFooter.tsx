import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import CTAButton from '@/components/ui/CTAButton';
import CookiePreferencesLink from '@/components/legal/CookiePreferencesLink';
import { WHATSAPP_GUILD_URL } from '@/lib/launch/constants';

const exploreLinks = [
  { href: '#planos', label: 'Planos' },
  { href: '#solucao', label: 'Como funciona' },
  { href: '#captura', label: 'Entrar na Guilda' },
];

const supportLinks = [{ href: '#faq', label: 'Perguntas frequentes' }];

const legalLinks = [
  { href: '/privacidade', label: 'Política de Privacidade' },
  { href: '/termos', label: 'Termos de Uso' },
] as const;

interface Props {
  isLoggedIn?: boolean;
}

export default function LaunchFooter({ isLoggedIn = false }: Props) {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-white/[0.06] bg-stone-950">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ember/30 to-transparent"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 md:py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto] lg:items-start lg:gap-8 xl:gap-10">
          <div className="max-w-sm">
            <Logo variant="footer" linked={false} />
            <p className="mt-4 text-sm leading-relaxed text-stone-400">
              A primeira assinatura mensal de cenários 3D modulares do Brasil.
              Entre na Guilda antes do lançamento oficial e garanta acesso de
              fundador.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <CTAButton
                label="Entrar na Guilda"
                size="sm"
                href={WHATSAPP_GUILD_URL}
                external
                className="w-full sm:w-auto"
              />
              {isLoggedIn ? (
                <CTAButton
                  label="Minha conta"
                  variant="default"
                  size="sm"
                  href="/dashboard"
                  className="w-full sm:w-auto"
                />
              ) : null}
            </div>
          </div>

          <nav aria-label="Explorar">
            <p className="font-display text-xs uppercase tracking-[0.3em] text-stone-500">
              Explorar
            </p>
            <ul className="mt-4 space-y-3">
              {exploreLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-stone-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Suporte">
            <p className="font-display text-xs uppercase tracking-[0.3em] text-stone-500">
              Suporte
            </p>
            <ul className="mt-4 space-y-3">
              {supportLinks.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-stone-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Legal">
            <p className="font-display text-xs uppercase tracking-[0.3em] text-stone-500">
              Legal
            </p>
            <ul className="mt-4 space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-stone-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <CookiePreferencesLink />
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.06] pt-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} DungeonBox. Todos os direitos reservados.</p>
          <p>Lançamento em breve · Vagas de fundador limitadas</p>
        </div>
      </div>
    </footer>
  );
}
