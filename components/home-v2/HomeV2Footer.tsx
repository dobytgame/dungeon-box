import Link from 'next/link';
import { ArrowUpRight, Instagram, Mail, MessageCircle } from 'lucide-react';
import CookiePreferencesLink from '@/components/legal/CookiePreferencesLink';
import HomeV2Button from '@/components/home-v2/HomeV2Button';
import Logo from '@/components/ui/Logo';
import { COMPANY } from '@/lib/legal/constants';
import { HOME_V2_COPY } from '@/lib/home-v2/content';

const LINK_GROUPS = [
  {
    title: 'Explorar',
    links: [
      { href: '#jornada', label: 'Como funciona' },
      { href: '#planos', label: 'Planos' },
      { href: '#dungeon-do-mes', label: 'Dungeon do mês' },
      { href: '#loja', label: 'Loja' },
      { href: '#prova', label: 'Depoimentos' },
    ],
  },
  {
    title: 'Suporte',
    links: [
      { href: '#faq', label: 'Perguntas frequentes' },
      { href: '#faq', label: 'Cancelar assinatura' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacidade', label: 'Política de Privacidade' },
      { href: '/termos', label: 'Termos de Uso' },
    ],
  },
] as const;

const CONTACTS = [
  {
    href: COMPANY.whatsappUrl,
    label: 'WhatsApp',
    value: COMPANY.whatsappDisplay,
    Icon: MessageCircle,
    external: true,
  },
  {
    href: COMPANY.instagramUrl,
    label: 'Instagram',
    value: COMPANY.instagramHandle,
    Icon: Instagram,
    external: true,
  },
  {
    href: `mailto:${COMPANY.supportEmail}`,
    label: 'E-mail',
    value: COMPANY.supportEmail,
    Icon: Mail,
    external: false,
  },
] as const;

const linkClass =
  'flex min-h-11 w-full cursor-pointer items-center text-sm text-mesa-ash transition-colors duration-200 hover:text-mesa-parchment focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mesa-ember';

export default function HomeV2Footer() {
  const year = new Date().getFullYear();
  const { footer } = HOME_V2_COPY;

  return (
    <footer className="relative isolate overflow-hidden border-t border-white/10 bg-mesa-ink px-4 pb-28 pt-16 sm:px-6 md:pb-0 md:pt-20">
      <div
        className="home-v2-grid home-v2-fog absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,transparent,#000_60%,#000)]"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-1/2 -z-10 h-64 w-[52rem] -translate-x-1/2 translate-y-1/2 rounded-full bg-mesa-ember/[0.1] blur-[110px]"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <Logo variant="footer" href="/home-v2" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-mesa-ash">{footer.tagline}</p>
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Destaques">
              {footer.specs.map((spec) => (
                <li
                  key={spec}
                  className="home-v2-display rounded-sm border border-white/10 px-2.5 py-1 text-[11px] tracking-[0.18em] text-mesa-parchment/80"
                >
                  {spec}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <HomeV2Button href="#planos" size="md" arrow className="w-full sm:w-auto">
                {footer.cta}
              </HomeV2Button>
              <p className="text-center text-sm text-mesa-ash sm:text-left">{footer.priceNote}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:col-span-7 lg:pl-8">
            {LINK_GROUPS.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <p className="home-v2-display text-xs tracking-[0.28em] text-mesa-parchment">
                  {group.title}
                </p>
                <ul className="mt-4 space-y-0.5">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith('/') ? (
                        <Link href={link.href} className={linkClass}>
                          {link.label}
                        </Link>
                      ) : (
                        <a href={link.href} className={linkClass}>
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                  {group.title === 'Legal' ? (
                    <li>
                      <CookiePreferencesLink className={`${linkClass} text-left`} />
                    </li>
                  ) : null}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <ul className="mt-14 grid gap-3 sm:grid-cols-3" aria-label="Fale com a gente">
          {CONTACTS.map(({ href, label, value, Icon, external }) => (
            <li key={label}>
              <a
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="group flex min-h-16 cursor-pointer items-center gap-4 rounded-sm border border-white/10 bg-mesa-stone/60 px-4 py-3 transition-colors duration-200 hover:border-mesa-ember/50 hover:bg-mesa-stone focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mesa-ember"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-white/[0.04] text-mesa-parchment transition-colors duration-200 group-hover:text-mesa-ember">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="home-v2-display block text-[11px] tracking-[0.22em] text-mesa-ash">
                    {label}
                  </span>
                  <span className="block truncate text-sm text-mesa-parchment">{value}</span>
                </span>
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-mesa-ash transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-mesa-ember"
                />
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-12 grid gap-6 border-t border-white/10 pt-8 text-xs leading-relaxed text-mesa-ash md:grid-cols-[auto_1fr_auto] md:items-end md:gap-10">
          <dl className="grid gap-4 sm:grid-cols-[auto_1fr] sm:gap-10">
            <div>
              <dt className="home-v2-display tracking-[0.22em] text-mesa-parchment/70">CNPJ</dt>
              <dd className="mt-1">{COMPANY.cnpj}</dd>
            </div>
            <div>
              <dt className="home-v2-display tracking-[0.22em] text-mesa-parchment/70">Endereço</dt>
              <dd className="mt-1">{COMPANY.address}</dd>
            </div>
          </dl>
          <span className="hidden md:block" />
          <div className="md:text-right">
            <p>
              © {year} {COMPANY.brand}. Todos os direitos reservados.
            </p>
            <p className="mt-1">{footer.closing}</p>
          </div>
        </div>
      </div>

      <p
        aria-hidden="true"
        data-reveal="mask"
        className="home-v2-reveal home-v2-display home-v2-wordmark pointer-events-none mt-10 select-none whitespace-nowrap text-center text-[clamp(4.5rem,19vw,17rem)] leading-[0.78] tracking-[0.02em] md:mt-14"
      >
        {COMPANY.brand}
      </p>
    </footer>
  );
}
