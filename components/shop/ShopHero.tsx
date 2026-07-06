import Link from 'next/link';

export default function ShopHero() {
  return (
    <section className="relative overflow-hidden border-b border-white/[0.06]">
      <div
        className="absolute inset-0 bg-gradient-to-br from-stone-900 via-[#0A0C10] to-[#0A0C10]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(249,115,22,0.15),transparent_50%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:py-28">
        <p className="font-display text-xs uppercase tracking-[0.35em] text-ember">
          Loja DungeonBox
        </p>
        <h1 className="mt-4 max-w-2xl font-display text-4xl uppercase leading-tight tracking-wide text-white sm:text-5xl lg:text-6xl">
          Extras para sua mesa de RPG
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-stone-400 sm:text-lg">
          Kits de pintura, cópias do kit do mês e acessórios para complementar
          sua dungeon — com a mesma qualidade da assinatura.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="#produtos"
            className="inline-flex min-h-[44px] items-center rounded-sm bg-ember px-6 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
          >
            Ver produtos
          </Link>
          <Link
            href="/#planos"
            className="inline-flex min-h-[44px] items-center rounded-sm border border-white/15 px-6 py-3 font-display text-xs uppercase tracking-widest text-stone-300 transition hover:border-ember/40 hover:text-white"
          >
            Conhecer assinatura
          </Link>
        </div>
      </div>
    </section>
  );
}
