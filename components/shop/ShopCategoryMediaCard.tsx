import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import StoreMediaImage from '@/components/store/StoreMediaImage';
import type { StoreCategory } from '@/lib/store/load-catalog';
import { stripHtmlTags } from '@/lib/ui/strip-html';
import { STORE_ROUTES } from '@/lib/store/routes';

interface Props {
  category: StoreCategory;
  className?: string;
  /** Shown as "01", "02"… when the card is part of a numbered set. */
  index?: number;
  ratioClassName?: string;
}

export function getCategoryCardImageUrl(category: StoreCategory): string | undefined {
  return category.thumbUrl ?? category.bannerUrl ?? undefined;
}

export default function ShopCategoryMediaCard({
  category,
  className = '',
  index,
  ratioClassName = 'aspect-[4/5]',
}: Props) {
  const imageUrl = getCategoryCardImageUrl(category);
  const descriptionPreview = category.description ? stripHtmlTags(category.description) : '';

  return (
    <Link
      href={STORE_ROUTES.category(category.slug)}
      className={`group relative block cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-mesa-ink transition-[border-color,box-shadow] duration-200 hover:border-white/25 hover:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)] ${className}`}
    >
      <div className={`relative w-full ${ratioClassName}`}>
        {imageUrl ? (
          <StoreMediaImage
            src={imageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 370px, (min-width: 640px) 33vw, 82vw"
            className="home-v2-media-zoom object-cover transition duration-500 ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <div className="home-v2-grid absolute inset-0 bg-mesa-stone" aria-hidden="true" />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-mesa-ink via-mesa-ink/45 to-transparent"
          aria-hidden="true"
        />

        <span
          aria-hidden="true"
          className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-mesa-ink/60 text-mesa-parchment ring-1 ring-inset ring-white/15 backdrop-blur-md transition-colors duration-200 group-hover:bg-mesa-ember group-hover:text-mesa-ink group-hover:ring-transparent"
        >
          <ArrowUpRight className="size-4" />
        </span>

        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          {index !== undefined ? (
            <p className="home-v2-display text-[11px] tabular-nums tracking-[0.28em] text-mesa-jade">
              {String(index + 1).padStart(2, '0')}
            </p>
          ) : null}
          <p className="home-v2-display mt-1 text-[clamp(1.75rem,4vw,2.25rem)] leading-none text-mesa-parchment">
            {category.name}
          </p>
          {descriptionPreview ? (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-mesa-ash">
              {descriptionPreview}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
