import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import CookiePreferencesLink from '@/components/legal/CookiePreferencesLink';
import GuildLpCta from '@/components/guild-lp/GuildLpCta';
import { GUILD_WHATSAPP_URL } from '@/lib/guild-lp/constants';

const exploreLinks = [
  { href: '#produto', label: 'O kit' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#planos', label: 'Planos' },
  { href: '#captura', label: 'Entrar na Guilda' },
];

const supportLinks = [{ href: '#faq', label: 'Perguntas frequentes' }];

const legalLinks = [
  { href: '/privacidade', label: 'Política de Privacidade' },
  { href: '/termos', label: 'Termos de Uso' },
] as const;

interface Props {
  isLoggedIn?: boolean;
  memberCount: number;
}

export default function GuildLpFooter({
  isLoggedIn = false,
  memberCount,
}: Props) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/[0.06] bg-relic-ink">
      <div className="mx-auto max-w-[1200px] px-5 py-12 sm:px-6 sm:py-14 md:py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-10">
          <div className="max-w-sm">
            <Logo variant="footer" linked={false} />
            <p className="mt-4 text-sm leading-relaxed text-relic-muted">
              A primeira assinatura mensal de cenários 3D modulares do Brasil.
              Todo mês um kit novo na sua porta.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <GuildLpCta
                href={GUILD_WHATSAPP_URL}
                className="min-h-[44px] px-5 py-2.5 text-sm sm:w-auto sm:min-h-[44px] sm:px-5 sm:py-2.5 sm:text-sm"
              >
                Entrar na Guilda
              </GuildLpCta>
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded border border-white/20 px-5 py-2.5 text-sm text-relic-parchment transition-colors duration-200 hover:border-white/40 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-relic-gold"
                >
                  Minha conta
                </Link>
              ) : null}
            </div>
          </div>

          <nav aria-label="Explorar">
            <p className="font-cinzel text-xs uppercase tracking-[0.28em] text-relic-faint">
              Explorar
            </p>
            <ul className="mt-4 space-y-3">
              {exploreLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="cursor-pointer text-sm text-relic-muted transition-colors hover:text-relic-parchment"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Suporte">
            <p className="font-cinzel text-xs uppercase tracking-[0.28em] text-relic-faint">
              Suporte
            </p>
            <ul className="mt-4 space-y-3">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="cursor-pointer text-sm text-relic-muted transition-colors hover:text-relic-parchment"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Legal">
            <p className="font-cinzel text-xs uppercase tracking-[0.28em] text-relic-faint">
              Legal
            </p>
            <ul className="mt-4 space-y-3">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="cursor-pointer text-sm text-relic-muted transition-colors hover:text-relic-parchment"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <CookiePreferencesLink className="cursor-pointer text-sm text-relic-muted transition-colors hover:text-relic-parchment focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-relic-gold" />
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.06] pt-8 text-sm text-relic-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} DungeonBox. Todos os direitos reservados.</p>
          <p>{memberCount} mestres já na Guilda · Gratuito entrar</p>
        </div>
      </div>
    </footer>
  );
}
