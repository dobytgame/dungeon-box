import Image from 'next/image';
import HomeV2Button from '@/components/home-v2/HomeV2Button';
import HomeV2SectionHeading from '@/components/home-v2/HomeV2SectionHeading';

export default function ShopSubscriptionBanner() {
  return (
    <section
      className="home-v2-grain relative isolate overflow-hidden border-t border-white/10 bg-mesa-ink px-4 py-24 sm:px-6 md:py-32"
      aria-labelledby="loja-assinatura-title"
    >
      <div className="absolute inset-0 -z-20" aria-hidden="true">
        <Image
          src="/images/home-v2/jornada-bg.webp"
          alt=""
          fill
          sizes="100vw"
          className="home-v2-journey-bg object-cover object-[70%_80%] opacity-40 saturate-[0.85]"
        />
      </div>
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_80%_at_50%_50%,rgb(10_11_13/0.55),rgb(10_11_13/0.95)_75%)]"
        aria-hidden="true"
      />
      <div
        className="home-v2-grid home-v2-fog absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_60%_70%_at_50%_50%,#000_10%,transparent_70%)]"
        aria-hidden="true"
      />

      <div className="mx-auto max-w-4xl text-center">
        <HomeV2SectionHeading
          eyebrow="Assinatura mensal"
          title="Uma dungeon nova na sua porta, todo mês"
          titleId="loja-assinatura-title"
          support="A loja complementa sua mesa — mas o coração do DungeonBox é a caixa mensal com peças modulares, temas exclusivos e fidelidade progressiva."
          align="center"
        />
        <div
          className="home-v2-reveal mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          style={{ '--stagger': 3 } as React.CSSProperties}
        >
          <HomeV2Button href="/#planos" size="lg" arrow className="w-full sm:w-auto">
            Ver planos de assinatura
          </HomeV2Button>
        </div>
      </div>
    </section>
  );
}
