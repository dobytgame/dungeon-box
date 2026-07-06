'use client';

import { Check, Minus, Plus, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useStoreCart } from '@/components/store/StoreCartProvider';
import { useAddToStoreCart } from '@/components/store/useAddToStoreCart';
import type { StoreProduct } from '@/lib/store/catalog';

interface Props {
  product: StoreProduct;
}

export default function StoreProductPurchasePanel({ product }: Props) {
  const { setQuantity, lines } = useStoreCart();
  const addToCart = useAddToStoreCart(product);
  const [added, setAdded] = useState(false);
  const [localQuantity, setLocalQuantity] = useState(1);
  const isMonthlyKit = product.category === 'monthly-kit';
  const maxQty = product.maxQuantity ?? 9;
  const cartLine = lines.find((line) => line.productId === product.id);
  const quantity = cartLine?.quantity ?? localQuantity;

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
    <div className="mt-8 space-y-4">
      <ul className="space-y-2 text-sm text-stone-400">
        {product.includes.map((item) => (
          <li key={item} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {isMonthlyKit ? (
        <div className="flex items-center justify-between gap-4">
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
          className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-sm bg-ember px-4 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
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

      <p className="text-xs text-stone-600">
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
    </div>
  );
}
