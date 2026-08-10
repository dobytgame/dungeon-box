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
      className="category-hero relative overflow-hidden border-b border-white/[0.06]"
      aria-labelledby="category-hero-title"
    >
      <div className="category-hero__frame relative">
        {imageUrl ? (
          <>
            <StoreMediaImage
              src={imageUrl}
              alt=""
              fill
              priority
              sizes="100vw"
              className="category-hero__image object-cover"
            />
            <div className="category-hero__overlay-left" aria-hidden="true" />
            <div className="category-hero__overlay-bottom" aria-hidden="true" />
          </>
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-stone-900 via-[#0A0C10] to-[#0A0C10]"
            aria-hidden="true"
          />
        )}
        <div
          className="category-hero__glow absolute inset-0"
          aria-hidden="true"
        />

        <div className="category-hero__content absolute inset-0 mx-auto flex max-w-7xl flex-col justify-end px-4 pb-10 pt-28 sm:px-6 sm:pb-12 sm:pt-32 lg:justify-center lg:pb-16 lg:pt-36">
          <div className="max-w-3xl">
            <p className="font-display text-xs uppercase tracking-[0.3em] text-ember">
              {categoryLabel}
            </p>
            <h1
              id="category-hero-title"
              className="mt-3 font-display text-4xl uppercase leading-[0.95] tracking-wide text-white sm:text-5xl lg:text-6xl"
            >
              {category.name}
            </h1>
            <div
              className="mt-5 h-px w-16 bg-gradient-to-r from-ember to-transparent"
              aria-hidden="true"
            />
            {category.description ? (
              <ProductDescriptionContent
                html={category.description}
                className="product-description--hero mt-5"
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
