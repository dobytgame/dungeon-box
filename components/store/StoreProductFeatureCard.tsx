'use client';

import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useState, type MouseEvent } from 'react';
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

export default function StoreProductFeatureCard({ product }: Props) {
  const addToCart = useAddToStoreCart(product);
  const [added, setAdded] = useState(false);
  const imageUrl = product.imageUrl ?? product.galleryUrls?.[0];
  const onSale =
    product.originalPriceCents !== undefined &&
    product.originalPriceCents > product.priceCents;
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
    <article className="group flex h-full flex-col overflow-hidden rounded-sm border border-white/[0.06] bg-stone-950/50 transition hover:border-white/15">
      <Link
        href={STORE_ROUTES.product(product.slug)}
        className="relative block aspect-square overflow-hidden bg-stone-900"
      >
        {imageUrl ? (
          <StoreMediaImage
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="h-full w-full bg-gradient-to-br from-stone-800 to-stone-950"
            aria-hidden="true"
          />
        )}

        {showSubscriberBadge ? (
          <span className="absolute left-2 top-2 rounded-sm bg-gold/90 px-1.5 py-0.5 font-display text-[9px] uppercase tracking-wider text-stone-950">
            {subscriberBadgeLabel}
          </span>
        ) : onSale ? (
          <span className="absolute left-2 top-2 rounded-sm bg-ember/90 px-1.5 py-0.5 font-display text-[9px] uppercase tracking-wider text-stone-950">
            Oferta
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-3">
        {product.storeCategoryName ? (
          <p className="truncate font-display text-[10px] uppercase tracking-[0.15em] text-stone-500">
            {product.storeCategoryName}
          </p>
        ) : null}

        <h3 className="mt-1 line-clamp-2 flex-1 font-display text-sm uppercase leading-snug tracking-wide text-white">
          <Link href={STORE_ROUTES.product(product.slug)} className="hover:text-ember">
            {product.name}
          </Link>
        </h3>

        <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
          {onSale ? (
            <span className="font-display text-xs text-stone-500 line-through">
              {formatMoney(product.originalPriceCents!)}
            </span>
          ) : null}
          <span className="font-display text-lg text-gold">{product.priceLabel}</span>
        </div>
        {!product.subscriberDiscount &&
        product.subscriberPriceCents != null &&
        product.subscriberPriceCents < product.priceCents ? (
          <p className="mt-1 text-[10px] text-gold/80">
            Assinantes: {formatMoney(product.subscriberPriceCents)}
          </p>
        ) : null}

        {productRequiresKitTheme(product) ? (
          <Link
            href={STORE_ROUTES.product(product.slug)}
            className="mt-3 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-sm bg-ember px-2 font-display text-[10px] uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
          >
            Escolher tema
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            className="mt-3 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-sm bg-ember px-2 font-display text-[10px] uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
          >
            <ShoppingCart className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {added ? 'Adicionado' : 'Adicionar'}
          </button>
        )}
      </div>
    </article>
  );
}
