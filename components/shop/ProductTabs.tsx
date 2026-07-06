import ProductDescriptionContent from '@/components/shop/ProductDescriptionContent';

interface Props {
  descriptionHtml?: string;
  tagline: string;
}

export default function ProductTabs({ descriptionHtml, tagline }: Props) {
  if (!descriptionHtml && !tagline) return null;

  return (
    <section className="mt-10 border-t border-white/[0.06] pt-8">
      <h2 className="font-display text-xs uppercase tracking-[0.2em] text-stone-500">
        Descrição
      </h2>
      <div className="mt-6">
        {descriptionHtml ? (
          <ProductDescriptionContent html={descriptionHtml} />
        ) : (
          <p className="max-w-3xl text-sm leading-relaxed text-stone-400 sm:text-base">
            {tagline}
          </p>
        )}
      </div>
    </section>
  );
}
