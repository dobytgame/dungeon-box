import HomeV2Button from '@/components/home-v2/HomeV2Button';

const SPECS = ['Escala 28mm', 'Encaixe OpenLOCK', 'Cancele quando quiser'];

export default function ShopIntermediateBanner() {
  return (
    <section className="bg-mesa-ink px-4 py-6 sm:px-6 md:py-10" aria-labelledby="loja-banner-assinatura">
      <div className="home-v2-reveal relative isolate mx-auto max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-mesa-stone">
        <div className="home-v2-grid home-v2-fog absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_80%_90%_at_100%_50%,#000_10%,transparent_70%)]" aria-hidden="true" />
        <div
          className="absolute -right-24 top-1/2 -z-10 h-72 w-96 -translate-y-1/2 rounded-full bg-mesa-ember/[0.14] blur-[100px]"
          aria-hidden="true"
        />
        <div className="grid gap-8 p-6 sm:p-10 md:grid-cols-[1fr_auto] md:items-center md:gap-12">
          <div>
            <p className="home-v2-display text-[11px] tracking-[0.28em] text-mesa-jade">Assinatura mensal</p>
            <h2
              id="loja-banner-assinatura"
              className="home-v2-display mt-3 text-balance text-[clamp(1.75rem,4.5vw,2.75rem)] leading-[0.95] text-mesa-parchment"
            >
              Monte sua dungeon do zero
            </h2>
            <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-mesa-ash">
              A assinatura entrega peças modulares OpenLOCK todo mês. A loja é para quem quer ir além
              com acessórios e extras.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Destaques da assinatura">
              {SPECS.map((spec) => (
                <li
                  key={spec}
                  className="home-v2-display rounded-sm border border-white/10 px-2.5 py-1 text-[11px] tracking-[0.18em] text-mesa-parchment/80"
                >
                  {spec}
                </li>
              ))}
            </ul>
          </div>
          <HomeV2Button href="/#planos" variant="secondary" arrow className="w-full md:w-auto">
            Ver assinatura
          </HomeV2Button>
        </div>
      </div>
    </section>
  );
}
