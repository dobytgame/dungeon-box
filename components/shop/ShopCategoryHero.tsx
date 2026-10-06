import ProductDescriptionContent from '@/components/shop/ProductDescriptionContent';
import StoreMediaImage from '@/components/store/StoreMediaImage';
import type { StoreCategory } from '@/lib/store/load-catalog';

interface Props {
  category: StoreCategory;
}

export default function ShopCategoryHero({ category }: Props) {
  const imageUrl = category.bannerUrl ?? category.thumbUrl ?? undefined;
  const categoryLabel = category.parentName ? 'Subcategoria' : 'Categoria';

  return (
    <section
      className="category-hero home-v2-grain relative isolate overflow-hidden border-b border-white/10 bg-mesa-ink"
      aria-labelledby="category-hero-title"
    >
      <div className="category-hero__frame relative flex flex-col">
        {imageUrl ? (
          <>
            <StoreMediaImage
              src={imageUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              className="category-hero__image -z-20 object-cover"
            />
            <div
              className="absolute inset-0 -z-10 bg-gradient-to-t from-mesa-ink via-mesa-ink/70 to-mesa-ink/10 lg:bg-gradient-to-r lg:from-mesa-ink lg:via-mesa-ink/75 lg:to-transparent"
              aria-hidden="true"
            />
            <div
              className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-mesa-ink to-transparent"
              aria-hidden="true"
            />
          </>
        ) : null}
        <div className="home-v2-grid home-v2-fog-load absolute inset-0 -z-10 opacity-60" aria-hidden="true" />

        <div className="category-hero__content relative mx-auto flex w-full max-w-[75rem] flex-1 flex-col justify-end px-4 pb-10 pt-28 sm:px-6 sm:pb-12 lg:justify-center lg:pb-16 lg:pt-20">
          <div className="max-w-2xl">
            <p
              className="home-v2-enter home-v2-display text-[11px] tracking-[0.28em] text-mesa-jade"
              style={{ '--enter-step': 0 } as React.CSSProperties}
            >
              {categoryLabel}
            </p>
            <h1
              id="category-hero-title"
              className="home-v2-enter home-v2-display mt-3 text-[clamp(2.75rem,9vw,5.5rem)] leading-[0.88] text-mesa-parchment"
              style={{ '--enter-step': 1 } as React.CSSProperties}
            >
              {category.name}
            </h1>
            {category.description ? (
              <div className="home-v2-enter" style={{ '--enter-step': 2 } as React.CSSProperties}>
                <ProductDescriptionContent
                  html={category.description}
                  className="product-description--hero mt-5"
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
