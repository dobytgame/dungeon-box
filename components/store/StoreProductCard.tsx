'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import StoreProductPurchaseActions from '@/components/store/StoreProductPurchaseActions';
import { useStoreCart } from '@/components/store/StoreCartProvider';
import { useAddToStoreCart } from '@/components/store/useAddToStoreCart';
import type { StoreProduct } from '@/lib/store/catalog';
import {
  formatSubscriberDiscountBadge,
  formatSubscriberDiscountSummary,
  SUBSCRIBER_STORE_DISCOUNT_BADGE,
  SUBSCRIBER_STORE_DISCOUNT_SUMMARY,
} from '@/lib/store/subscriber-discount';
import { formatMoney } from '@/lib/dashboard/format';
import { cartLineId } from '@/lib/store/product-variations';

import { STORE_ROUTES } from '@/lib/store/routes';
import {
  STORE_PRODUCT_IMAGE_SIZE,
  storeProductImageClassName,
} from '@/lib/store/product-media';

interface Props {
  product: StoreProduct;
}

export default function StoreProductCard({ product }: Props) {
  const { setQuantity, lines } = useStoreCart();
  const addToCart = useAddToStoreCart(product);
  const [added, setAdded] = useState(false);
  const [imageHover, setImageHover] = useState(false);
  const [localQuantity, setLocalQuantity] = useState(1);
  const isMonthlyKit = product.category === 'monthly-kit';
  const isStandaloneMonthlyKit =
    isMonthlyKit && !product.requiresSubscriptionBundle;
  const maxQty = product.maxQuantity ?? 9;
  const cartLine = lines.find((line) => line.productId === product.id);
  const quantity = cartLine?.quantity ?? localQuantity;
  const primaryImageUrl = product.imageUrl ?? product.galleryUrls?.[0];
  const hoverImageUrl =
    product.galleryUrls?.find((url) => url !== primaryImageUrl) ??
    product.galleryUrls?.[0];
  const onSale =
    product.originalPriceCents !== undefined &&
    product.originalPriceCents > product.priceCents;
  const showSubscriberBadge = product.subscriberDiscount && onSale;
  const subscriberBadgeLabel = product.subscriberDiscountAppliedPercent
    ? formatSubscriberDiscountBadge(product.subscriberDiscountAppliedPercent)
    : SUBSCRIBER_STORE_DISCOUNT_BADGE;
  const subscriberSummary = product.subscriberDiscountAppliedPercent
    ? formatSubscriberDiscountSummary(product.subscriberDiscountAppliedPercent)
    : SUBSCRIBER_STORE_DISCOUNT_SUMMARY;

  function updateQuantity(next: number) {
    const clamped = Math.min(Math.max(next, 1), maxQty);
    if (cartLine) {
      setQuantity(cartLineId(cartLine), clamped);
    } else {
      setLocalQuantity(clamped);
    }
  }

  function handleAdd() {
    addToCart(quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <article
      className={`relative flex h-full flex-col rounded-sm border bg-stone-950/50 p-5 transition hover:border-white/15 ${
        product.featured || isMonthlyKit
          ? 'border-gold/30 shadow-[0_0_40px_-12px_rgba(212,168,83,0.25)]'
          : 'border-white/[0.06]'
      }`}
    >
      {product.featured && !isMonthlyKit ? (
        <span className="absolute right-4 top-4 rounded-sm bg-gold/15 px-2 py-1 font-display text-[10px] uppercase tracking-widest text-gold">
          Destaque
        </span>
      ) : null}
      {showSubscriberBadge ? (
        <span className="absolute left-4 top-4 rounded-sm bg-gold/15 px-2 py-1 font-display text-[10px] uppercase tracking-widest text-gold">
          {subscriberBadgeLabel}
        </span>
      ) : onSale ? (
        <span className="absolute left-4 top-4 rounded-sm bg-ember/15 px-2 py-1 font-display text-[10px] uppercase tracking-widest text-ember">
          Oferta
        </span>
      ) : null}
      {isMonthlyKit ? (
        <span className="absolute right-4 top-4 rounded-sm bg-gold/15 px-2 py-1 font-display text-[10px] uppercase tracking-widest text-gold">
          {isStandaloneMonthlyKit ? 'Kit avulso' : 'Assinantes'}
        </span>
      ) : null}

      {primaryImageUrl ? (
        <Link
          href={STORE_ROUTES.product(product.slug)}
          className="group/image relative mb-4 block overflow-hidden rounded-sm"
          onMouseEnter={() => setImageHover(true)}
          onMouseLeave={() => setImageHover(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              imageHover && hoverImageUrl ? hoverImageUrl : primaryImageUrl
            }
            alt={product.name}
            width={STORE_PRODUCT_IMAGE_SIZE}
            height={STORE_PRODUCT_IMAGE_SIZE}
            className={`${storeProductImageClassName} transition duration-300 group-hover/image:scale-[1.02]`}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-stone-950/90 to-transparent p-4 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
            <span className="font-display text-[10px] uppercase tracking-widest text-white">
              Ver produto
            </span>
          </div>
        </Link>
      ) : null}

      <p className="font-display text-xs uppercase tracking-[0.2em] text-stone-500">
        {product.storeCategoryName ??
          (isMonthlyKit
            ? 'Kit do mês'
            : product.category === 'paint-kit'
              ? 'Kit de pintura'
              : 'Produto')}
      </p>
      <h3 className="mt-2 font-display text-xl uppercase tracking-wide text-white">
        <Link href={STORE_ROUTES.product(product.slug)} className="hover:text-ember">
          {product.name}
        </Link>
      </h3>
      <p className="mt-2 text-sm text-stone-400">{product.tagline}</p>
      <div className="mt-4">
        {product.originalPriceCents &&
        product.originalPriceCents > product.priceCents ? (
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="font-display text-sm text-stone-500 line-through">
              {formatMoney(product.originalPriceCents)}
            </p>
            <p className="font-display text-2xl text-ember">{product.priceLabel}</p>
          </div>
        ) : (
          <p className="font-display text-2xl text-gold">{product.priceLabel}</p>
        )}
        {product.subscriberDiscount ? (
          <p className="mt-1 text-xs text-gold/80">{subscriberSummary}</p>
        ) : product.promoCode ? (
          <p className="mt-1 text-xs text-gold/80">
            Cupom {product.promoCode} — {product.promoSummary}
          </p>
        ) : null}
      </div>

      <ul className="mt-4 flex-1 space-y-2 text-sm text-stone-400">
        {product.includes.map((item) => (
          <li key={item} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <StoreProductPurchaseActions
        className="mt-6"
        quantity={quantity}
        maxQty={maxQty}
        onQuantityChange={updateQuantity}
        onAdd={handleAdd}
        added={added}
        addLabel={isMonthlyKit ? 'Adicionar' : 'Adicionar ao carrinho'}
        variant="card"
      />

      <p className="mt-3 text-center text-xs text-stone-600">
        {isMonthlyKit ? (
          isStandaloneMonthlyKit ? (
            <>Frete calculado por região no checkout.</>
          ) : (
            <>Frete grátis — enviado com a próxima caixa da assinatura.</>
          )
        ) : product.category === 'store-item' ? (
          <>Frete calculado por região no checkout.</>
        ) : (
          <>
            Assinantes: frete grátis na{' '}
            <Link href="/dashboard/subscription" className="text-ember hover:underline">
              próxima caixa
            </Link>
          </>
        )}
      </p>
    </article>
  );
}
