import Link from 'next/link';
import { STORE_ROUTES } from '@/lib/store/routes';

export default function ShopIntermediateBanner() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="overflow-hidden rounded-sm border border-white/[0.08] bg-stone-950/60">
        <div className="grid gap-6 p-8 sm:grid-cols-[1fr_auto] sm:items-center sm:p-10">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.25em] text-stone-500">
              Kits avulsos
            </p>
            <h2 className="mt-2 font-display text-2xl uppercase tracking-wide text-white">
              Monte sua dungeon do zero
            </h2>
            <p className="mt-3 max-w-xl text-sm text-stone-400">
              A assinatura mensal entrega peças modulares OpenLOCK todo mês. A loja
              é para quem quer ir além com acessórios e extras.
            </p>
          </div>
          <Link
            href="/#planos"
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-sm border border-ember/40 px-6 py-3 font-display text-xs uppercase tracking-widest text-ember transition hover:bg-ember/10"
          >
            Ver assinatura
          </Link>
        </div>
      </div>
    </section>
  );
}
