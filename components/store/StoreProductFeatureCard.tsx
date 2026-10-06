'use client';

import { Check, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useState, type MouseEvent } from 'react';
import { homeV2ButtonClassName } from '@/components/home-v2/HomeV2Button';
import StoreBadge from '@/components/store/StoreBadge';
import { useAddToStoreCart } from '@/components/store/useAddToStoreCart';
import StoreMediaImage from '@/components/store/StoreMediaImage';
import { formatMoney } from '@/lib/dashboard/format';
import type { StoreProduct } from '@/lib/store/catalog';
import { productRequiresKitTheme } from '@/lib/store/catalog';
import { STORE_ROUTES } from '@/lib/store/routes';
import { formatSubscriberDiscountBadge } from '@/lib/store/subscriber-discount';

interface Props {
  product: StoreProduct;
}

const actionClassName = homeV2ButtonClassName({
  size: 'sm',
  className: 'mt-4 w-full',
});

export default function StoreProductFeatureCard({ product }: Props) {
  const addToCart = useAddToStoreCart(product);
  const [added, setAdded] = useState(false);
  const imageUrl = product.imageUrl ?? product.galleryUrls?.[0];
  const productHref = STORE_ROUTES.product(product.slug);
  const onSale =
    product.originalPriceCents !== undefined && product.originalPriceCents > product.priceCents;
  const showSubscriberBadge = product.subscriberDiscount && onSale;
  const subscriberBadgeLabel = formatSubscriberDiscountBadge(
    product.subscriberDiscountAppliedPercent
  );

  function handleAdd(e: MouseEvent) {
    e.preventDefault();
    addToCart(1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }

  return (
    <article className="group flex w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-mesa-stone transition-[border-color,box-shadow] duration-200 hover:border-white/25 hover:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.9)]">
      <Link
        href={productHref}
        className="relative block aspect-square overflow-hidden bg-mesa-ink"
        aria-label={`Ver ${product.name}`}
      >
        {imageUrl ? (
          <StoreMediaImage
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 270px, (min-width: 640px) 45vw, 50vw"
            className="home-v2-media-zoom object-cover transition duration-300 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="home-v2-grid size-full" aria-hidden="true" />
        )}
        {showSubscriberBadge || onSale ? (
          <span className="absolute left-2.5 top-2.5">
            {showSubscriberBadge ? (
              <StoreBadge tone="jade">{subscriberBadgeLabel}</StoreBadge>
            ) : (
              <StoreBadge tone="ember">Oferta</StoreBadge>
            )}
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        {product.storeCategoryName ? (
          <p className="truncate text-[11px] uppercase tracking-[0.16em] text-mesa-ash">
            {product.storeCategoryName}
          </p>
        ) : null}
        <h3
          className="mt-1 line-clamp-3 text-[15px] leading-snug text-mesa-parchment sm:text-base"
          title={product.name}
        >
          <Link href={productHref} className="transition-colors hover:text-mesa-ember">
            {product.name}
          </Link>
        </h3>

        <div className="mt-auto pt-3">
          <p className="flex flex-wrap items-baseline gap-x-2">
            {onSale ? (
              <span className="text-xs text-mesa-ash line-through">
                {formatMoney(product.originalPriceCents!)}
              </span>
            ) : null}
            <span className="font-semibold tabular-nums text-mesa-parchment">{product.priceLabel}</span>
          </p>
          {!product.subscriberDiscount &&
          product.subscriberPriceCents != null &&
          product.subscriberPriceCents < product.priceCents ? (
            <p className="mt-0.5 text-[11px] font-medium text-mesa-jade">
              Assinantes: {formatMoney(product.subscriberPriceCents)}
            </p>
          ) : null}
        </div>

        {productRequiresKitTheme(product) ? (
          <Link href={productHref} className={actionClassName}>
            Escolher tema
          </Link>
        ) : (
          <button type="button" onClick={handleAdd} className={actionClassName} aria-live="polite">
            {added ? (
              <Check className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <ShoppingBag className="size-4 shrink-0" aria-hidden="true" />
            )}
            {added ? 'Adicionado' : 'Adicionar'}
          </button>
        )}
      </div>
    </article>
  );
}
