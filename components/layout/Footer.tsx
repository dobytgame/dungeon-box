import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import CTAButton from '@/components/ui/CTAButton';
import CookiePreferencesLink from '@/components/legal/CookiePreferencesLink';

const exploreLinks = [
  { href: '#planos', label: 'Planos' },
  { href: '#fidelidade', label: 'Fidelidade' },
  { href: '#temas', label: 'Temas' },
];

const supportLinks = [
  { href: '#faq', label: 'Perguntas frequentes' },
  { href: '#faq', label: 'Cancelar assinatura' },
];

const legalLinks = [
  { href: '/privacidade', label: 'Política de Privacidade' },
  { href: '/termos', label: 'Termos de Uso' },
] as const;

interface FooterProps {
  isLoggedIn?: boolean;
}

export default function Footer({ isLoggedIn = false }: FooterProps) {
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
              Cenários 3D modulares para RPG. Uma dungeon nova na sua porta, todo
              mês — impressão premium, escala 28mm, sistema de encaixe universal.
            </p>
            <div className="mt-6">
              <CTAButton
                label={isLoggedIn ? 'Minha conta' : 'Assinar agora'}
                size="sm"
                href={isLoggedIn ? '/dashboard' : '/checkout?plan=heroi'}
                className="w-full sm:w-auto"
              />
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
                    className="cursor-pointer text-sm text-stone-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
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
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="cursor-pointer text-sm text-stone-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
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
                    className="cursor-pointer text-sm text-stone-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
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

          <div className="flex flex-col gap-4 md:items-start lg:items-end">
            <p className="font-display text-xs uppercase tracking-[0.3em] text-stone-500 lg:text-right">
              Comece hoje
            </p>
            <CTAButton
              label={isLoggedIn ? 'Minha conta' : 'Assinar'}
              size="sm"
              href={isLoggedIn ? '/dashboard' : '/checkout?plan=heroi'}
              className="w-full sm:w-auto lg:min-w-[9rem]"
            />
            <p className="text-xs leading-relaxed text-stone-600 lg:text-right">
              Kits mensais a partir de R$ 89
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/[0.06] pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-stone-600">
            © {year} DungeonBox. Todos os direitos reservados.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-stone-600">
            <Link href="/privacidade" className="cursor-pointer hover:text-stone-400">
              Privacidade
            </Link>
            <Link href="/termos" className="cursor-pointer hover:text-stone-400">
              Termos
            </Link>
            <CookiePreferencesLink className="cursor-pointer text-xs text-stone-600 transition-colors hover:text-stone-400" />
            <span>Feito para mesas de RPG em todo o Brasil.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
