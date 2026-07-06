import Link from 'next/link';

export default function ShopSubscriptionBanner() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="relative overflow-hidden rounded-sm border border-ember/25 bg-gradient-to-r from-ember/10 via-stone-950/80 to-stone-950/80 p-8 sm:p-10">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-ember/10 blur-3xl"
          aria-hidden="true"
        />
        <p className="font-display text-xs uppercase tracking-[0.25em] text-ember">
          Assinatura mensal
        </p>
        <h2 className="mt-3 max-w-lg font-display text-2xl uppercase tracking-wide text-white sm:text-3xl">
          Uma dungeon nova na sua porta, todo mês
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-stone-400">
          A loja complementa sua mesa — mas o coração do DungeonBox é a caixa
          mensal com peças modulares, temas exclusivos e fidelidade progressiva.
        </p>
        <Link
          href="/#planos"
          className="mt-6 inline-flex min-h-[44px] items-center rounded-sm bg-ember px-6 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
        >
          Ver planos de assinatura
        </Link>
      </div>
    </section>
  );
}
