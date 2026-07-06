import Link from 'next/link';
import type { StoreCategory } from '@/lib/store/load-catalog';
import { stripHtmlTags } from '@/lib/ui/strip-html';
import { STORE_ROUTES } from '@/lib/store/routes';

interface Props {
  category: StoreCategory;
  className?: string;
}

export function getCategoryCardImageUrl(category: StoreCategory): string | undefined {
  return category.thumbUrl ?? category.bannerUrl ?? undefined;
}

export default function ShopCategoryMediaCard({ category, className = '' }: Props) {
  const imageUrl = getCategoryCardImageUrl(category);
  const descriptionPreview = category.description
    ? stripHtmlTags(category.description)
    : '';

  return (
    <Link
      href={STORE_ROUTES.category(category.slug)}
      className={`group relative block overflow-hidden rounded-sm border border-white/[0.08] bg-stone-950/60 transition hover:border-ember/40 ${className}`}
    >
      <div className="relative aspect-square w-full">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-stone-800 via-stone-900 to-stone-950"
            aria-hidden="true"
          />
        )}

        <div
          className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent opacity-80 transition duration-300 group-hover:opacity-100"
          aria-hidden="true"
        />

        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <p className="translate-y-1 font-display text-base uppercase tracking-[0.12em] text-white transition duration-300 group-hover:translate-y-0 group-hover:text-ember sm:text-lg">
            {category.name}
          </p>
          {descriptionPreview ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-400 opacity-0 transition duration-300 group-hover:opacity-100 sm:text-sm">
              {descriptionPreview}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
