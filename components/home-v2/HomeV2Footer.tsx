import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import HomeV2Button from '@/components/home-v2/HomeV2Button';
import { COMPANY } from '@/lib/legal/constants';

export default function HomeV2Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-mesa-ink px-4 py-12 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <Logo variant="footer" href="/home-v2" />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-mesa-ash">
            Sua dungeon cresce com a sua campanha. Cenários 3D modulares, todo mês.
          </p>
        </div>
        <div className="flex flex-col items-start gap-4">
          <HomeV2Button href="#planos">Começar assinatura</HomeV2Button>
          <nav className="flex flex-wrap gap-4 text-sm text-mesa-ash" aria-label="Rodapé">
            <a href="#planos" className="hover:text-mesa-parchment">
              Planos
            </a>
            <a href="#loja" className="hover:text-mesa-parchment">
              Loja
            </a>
            <a href="#faq" className="hover:text-mesa-parchment">
              FAQ
            </a>
            <Link href="/privacidade" className="hover:text-mesa-parchment">
              Privacidade
            </Link>
            <Link href="/termos" className="hover:text-mesa-parchment">
              Termos
            </Link>
          </nav>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-6xl text-xs text-mesa-ash">
        © {year} {COMPANY.legalName}. Prévia interna da Home V2.
      </p>
    </footer>
  );
}
