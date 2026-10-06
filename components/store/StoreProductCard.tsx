'use client';

import { ArrowUpRight, Check } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { homeV2ButtonClassName } from '@/components/home-v2/HomeV2Button';
import StoreProductPurchaseActions from '@/components/store/StoreProductPurchaseActions';
import { useStoreCart } from '@/components/store/StoreCartProvider';
import { useAddToStoreCart } from '@/components/store/useAddToStoreCart';
import StoreBadge from '@/components/store/StoreBadge';
import StoreMediaImage from '@/components/store/StoreMediaImage';
import type { StoreProduct } from '@/lib/store/catalog';
import { productRequiresKitTheme } from '@/lib/store/catalog';
import {
  formatSubscriberDiscountBadge,
  formatSubscriberDiscountSummary,
} from '@/lib/store/subscriber-discount';
import { formatMoney } from '@/lib/dashboard/format';
import { cartLineId } from '@/lib/store/product-variations';
import { STORE_ROUTES } from '@/lib/store/routes';

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
  const isStandaloneMonthlyKit = isMonthlyKit && !product.requiresSubscriptionBundle;
  const maxQty = product.maxQuantity ?? 9;
  const cartLine = lines.find((line) => line.productId === product.id);
  const quantity = cartLine?.quantity ?? localQuantity;
  const primaryImageUrl = product.imageUrl ?? product.galleryUrls?.[0];
  const hoverImageUrl =
    product.galleryUrls?.find((url) => url !== primaryImageUrl) ?? product.galleryUrls?.[0];
  const onSale =
    product.originalPriceCents !== undefined && product.originalPriceCents > product.priceCents;
  const showSubscriberBadge = product.subscriberDiscount && onSale;
  const subscriberBadgeLabel = formatSubscriberDiscountBadge(
    product.subscriberDiscountAppliedPercent
  );
  const subscriberSummary = formatSubscriberDiscountSummary(
    product.subscriberDiscountAppliedPercent
  );
  const showSubscriberTeaser =
    !product.subscriberDiscount &&
    product.subscriberPriceCents != null &&
    product.subscriberPriceCents < product.priceCents;
  const productHref = STORE_ROUTES.product(product.slug);
  const categoryLabel =
    product.storeCategoryName ??
    (isMonthlyKit ? 'Kit do mês' : product.category === 'paint-kit' ? 'Kit de pintura' : 'Produto');

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
      className={`group relative flex w-full flex-col overflow-hidden rounded-2xl border bg-mesa-stone transition-[border-color,box-shadow] duration-200 ${
        product.featured
          ? 'border-mesa-ember/50 shadow-[0_30px_70px_-34px_rgba(255,100,45,0.5)]'
          : 'border-white/10 hover:border-white/25 hover:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.9)]'
      }`}
    >
      <div className="relative">
        {primaryImageUrl ? (
          <Link
            href={productHref}
            className="relative block aspect-square overflow-hidden bg-mesa-ink"
            onMouseEnter={() => setImageHover(true)}
            onMouseLeave={() => setImageHover(false)}
            aria-label={`Ver ${product.name}`}
          >
            <StoreMediaImage
              src={imageHover && hoverImageUrl ? hoverImageUrl : primaryImageUrl}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 360px, (min-width: 640px) 45vw, 100vw"
              className="home-v2-media-zoom object-cover transition duration-300 ease-out group-hover:scale-[1.04]"
            />
            <span
              aria-hidden="true"
              className="absolute bottom-3 right-3 flex size-10 items-center justify-center rounded-full bg-mesa-ink/70 text-mesa-parchment opacity-0 backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100"
            >
              <ArrowUpRight className="size-4" />
            </span>
          </Link>
        ) : (
          <div className="home-v2-grid aspect-square bg-mesa-ink" aria-hidden="true" />
        )}

        <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
          <span className="flex flex-wrap gap-1.5">
            {showSubscriberBadge ? (
              <StoreBadge tone="jade">{subscriberBadgeLabel}</StoreBadge>
            ) : onSale ? (
              <StoreBadge tone="ember">Oferta</StoreBadge>
            ) : null}
          </span>
          <span className="flex flex-wrap gap-1.5">
            {isMonthlyKit ? (
              <StoreBadge tone="ghost">{isStandaloneMonthlyKit ? 'Kit avulso' : 'Assinantes'}</StoreBadge>
            ) : product.featured ? (
              <StoreBadge tone="ember">Destaque</StoreBadge>
            ) : null}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="home-v2-display text-[11px] tracking-[0.2em] text-mesa-ash">{categoryLabel}</p>
        <h3 className="home-v2-display mt-2 text-2xl leading-none text-mesa-parchment">
          <Link href={productHref} className="transition-colors hover:text-mesa-ember">
            {product.name}
          </Link>
        </h3>
        {product.tagline ? (
          <p className="mt-2 text-sm leading-relaxed text-mesa-ash">{product.tagline}</p>
        ) : null}

        <div className="mt-4">
          <p className="flex flex-wrap items-baseline gap-2">
            {onSale ? (
              <span className="text-sm text-mesa-ash line-through">
                {formatMoney(product.originalPriceCents!)}
              </span>
            ) : null}
            <span className="text-2xl font-semibold tabular-nums text-mesa-parchment">
              {product.priceLabel}
            </span>
          </p>
          {product.subscriberDiscount ? (
            <p className="mt-1 text-xs font-medium text-mesa-jade">{subscriberSummary}</p>
          ) : showSubscriberTeaser ? (
            <p className="mt-1 text-xs font-medium text-mesa-jade">
              Assinantes: {formatMoney(product.subscriberPriceCents!)}
            </p>
          ) : product.promoCode ? (
            <p className="mt-1 text-xs font-medium text-mesa-jade">
              Cupom {product.promoCode} — {product.promoSummary}
            </p>
          ) : null}
        </div>

        {product.includes.length > 0 ? (
          <ul className="mt-5 flex-1 space-y-2 border-t border-white/10 pt-5 text-sm text-mesa-ash">
            {product.includes.map((item) => (
              <li key={item} className="flex gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-mesa-jade" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex-1" />
        )}

        {productRequiresKitTheme(product) ? (
          <Link
            href={productHref}
            className={homeV2ButtonClassName({ className: 'mt-6 w-full' })}
          >
            Escolher tema
          </Link>
        ) : (
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
        )}

        <p className="mt-3 text-center text-xs text-mesa-ash/80">
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
              <Link
                href="/dashboard/subscription"
                className="text-mesa-parchment underline decoration-mesa-ember/60 underline-offset-2 hover:decoration-mesa-ember"
              >
                próxima caixa
              </Link>
            </>
          )}
        </p>
      </div>
    </article>
  );
}
