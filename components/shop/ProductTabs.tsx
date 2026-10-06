import ProductDescriptionContent from '@/components/shop/ProductDescriptionContent';

interface Props {
  descriptionHtml?: string;
  tagline: string;
}

export default function ProductTabs({ descriptionHtml, tagline }: Props) {
  if (!descriptionHtml && !tagline) return null;

  return (
    <section
      className="mt-16 grid gap-6 border-t border-white/10 pt-10 md:grid-cols-[minmax(0,0.35fr)_minmax(0,0.65fr)] md:gap-14"
      aria-labelledby="produto-descricao-title"
    >
      <div>
        <p className="home-v2-display text-[11px] tracking-[0.28em] text-mesa-jade">Sobre o produto</p>
        <h2
          id="produto-descricao-title"
          data-reveal="mask"
          className="home-v2-reveal home-v2-display mt-3 text-[clamp(1.75rem,4vw,2.5rem)] leading-[0.95] text-mesa-parchment"
        >
          Descrição
        </h2>
      </div>
      <div className="home-v2-reveal min-w-0">
        {descriptionHtml ? (
          <ProductDescriptionContent html={descriptionHtml} />
        ) : (
          <p className="max-w-3xl text-base leading-relaxed text-mesa-ash">{tagline}</p>
        )}
      </div>
    </section>
  );
}
