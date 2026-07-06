import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import { COMPANY } from '@/lib/legal/constants';
import { STORE_ROUTES } from '@/lib/store/routes';

interface Props {
  isLoggedIn?: boolean;
}

export default function ShopFooter({ isLoggedIn = false }: Props) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/[0.08] bg-[#0A0C10]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo variant="footer" linked={false} href={STORE_ROUTES.home} />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-stone-400">
              Acessórios e extras para sua mesa de RPG. Kits de pintura, cópias do
              kit do mês e materiais para complementar sua dungeon.
            </p>
            <Link
              href="/#planos"
              className="mt-6 inline-flex min-h-[44px] items-center rounded-sm bg-ember px-5 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
            >
              {isLoggedIn ? 'Ver minha assinatura' : 'Conhecer os planos'}
            </Link>
          </div>

          <nav aria-label="Loja">
            <p className="font-display text-xs uppercase tracking-[0.3em] text-stone-500">
              Loja
            </p>
            <ul className="mt-4 space-y-3 text-sm text-stone-400">
              <li>
                <Link href={STORE_ROUTES.home} className="hover:text-white">
                  Todos os produtos
                </Link>
              </li>
              <li>
                <Link href={STORE_ROUTES.cart} className="hover:text-white">
                  Carrinho
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-white">
                  Site principal
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Suporte">
            <p className="font-display text-xs uppercase tracking-[0.3em] text-stone-500">
              Suporte
            </p>
            <ul className="mt-4 space-y-3 text-sm text-stone-400">
              <li>
                <a href={COMPANY.whatsappUrl} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              </li>
              <li>
                <Link href="/privacidade" className="hover:text-white">
                  Privacidade
                </Link>
              </li>
              <li>
                <Link href="/termos" className="hover:text-white">
                  Termos
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <p className="mt-10 border-t border-white/[0.06] pt-6 text-xs text-stone-600">
          © {year} DungeonBox. A assinatura mensal continua sendo o coração da
          experiência — a loja é para quem quer ir além.
        </p>
      </div>
    </footer>
  );
}
