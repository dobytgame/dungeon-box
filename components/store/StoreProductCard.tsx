'use client';

import { Check, Minus, Plus, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useStoreCart } from '@/components/store/StoreCartProvider';
import { useAddToStoreCart } from '@/components/store/useAddToStoreCart';
import type { StoreProduct } from '@/lib/store/catalog';
import { formatMoney } from '@/lib/dashboard/format';

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
  const maxQty = product.maxQuantity ?? 9;
  const cartLine = lines.find((line) => line.productId === product.id);
  const quantity = cartLine?.quantity ?? localQuantity;
  const hoverImageUrl =
    product.galleryUrls?.find((url) => url !== product.imageUrl) ??
    product.galleryUrls?.[0];
  const onSale =
    product.originalPriceCents !== undefined &&
    product.originalPriceCents > product.priceCents;

  function updateQuantity(next: number) {
    const clamped = Math.min(Math.max(next, 1), maxQty);
    if (cartLine) {
      setQuantity(product.id, clamped);
    } else {
      setLocalQuantity(clamped);
    }
  }

  function handleAdd() {
    addToCart(isMonthlyKit ? quantity : 1);
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
      {onSale ? (
        <span className="absolute left-4 top-4 rounded-sm bg-ember/15 px-2 py-1 font-display text-[10px] uppercase tracking-widest text-ember">
          Oferta
        </span>
      ) : null}
      {isMonthlyKit ? (
        <span className="absolute right-4 top-4 rounded-sm bg-gold/15 px-2 py-1 font-display text-[10px] uppercase tracking-widest text-gold">
          Assinantes
        </span>
      ) : null}

      {product.imageUrl ? (
        <Link
          href={STORE_ROUTES.product(product.slug)}
          className="group/image relative mb-4 block overflow-hidden rounded-sm"
          onMouseEnter={() => setImageHover(true)}
          onMouseLeave={() => setImageHover(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              imageHover && hoverImageUrl ? hoverImageUrl : product.imageUrl
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
            <p className="font-display text-lg text-stone-500 line-through">
              {formatMoney(product.originalPriceCents)}
            </p>
            <p className="font-display text-2xl text-gold">{product.priceLabel}</p>
          </div>
        ) : (
          <p className="font-display text-2xl text-gold">{product.priceLabel}</p>
        )}
        {product.promoCode ? (
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

      {isMonthlyKit ? (
        <div className="mt-6 flex items-center justify-between gap-4">
          <div>
            <p className="font-display text-[10px] uppercase tracking-widest text-stone-500">
              Quantidade
            </p>
            <div className="mt-2 flex items-center rounded-sm border border-white/10">
              <button
                type="button"
                aria-label="Diminuir quantidade"
                onClick={() => updateQuantity(quantity - 1)}
                className="flex h-10 w-10 cursor-pointer items-center justify-center text-stone-400 hover:text-white"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-[2rem] text-center text-sm text-white">
                {quantity}
              </span>
              <button
                type="button"
                aria-label="Aumentar quantidade"
                onClick={() => updateQuantity(quantity + 1)}
                className="flex h-10 w-10 cursor-pointer items-center justify-center text-stone-400 hover:text-white"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-sm bg-ember px-4 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
          >
            {added ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                Adicionado
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                Adicionar
              </>
            )}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleAdd}
          className="mt-6 inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-sm bg-ember px-4 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
        >
          {added ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              Adicionado
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              Adicionar ao carrinho
            </>
          )}
        </button>
      )}

      <p className="mt-3 text-center text-xs text-stone-600">
        {isMonthlyKit ? (
          <>Frete grátis — enviado com a próxima caixa da assinatura.</>
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
