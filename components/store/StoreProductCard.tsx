'use client';

import { Check, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useStoreCart } from '@/components/store/StoreCartProvider';
import type { StoreProduct } from '@/lib/store/catalog';

interface Props {
  product: StoreProduct;
}

export default function StoreProductCard({ product }: Props) {
  const { addItem } = useStoreCart();
  const [added, setAdded] = useState(false);

  return (
    <article
      className={`relative flex h-full flex-col rounded-sm border bg-stone-950/50 p-5 transition hover:border-white/15 ${
        product.featured
          ? 'border-gold/30 shadow-[0_0_40px_-12px_rgba(212,168,83,0.25)]'
          : 'border-white/[0.06]'
      }`}
    >
      {product.featured ? (
        <span className="absolute right-4 top-4 rounded-sm bg-gold/15 px-2 py-1 font-display text-[10px] uppercase tracking-widest text-gold">
          Mais popular
        </span>
      ) : null}

      <p className="font-display text-xs uppercase tracking-[0.2em] text-stone-500">
        Kit de pintura
      </p>
      <h3 className="mt-2 font-display text-xl uppercase tracking-wide text-white">
        {product.name}
      </h3>
      <p className="mt-2 text-sm text-stone-400">{product.tagline}</p>
      <p className="mt-4 font-display text-2xl text-gold">{product.priceLabel}</p>

      <ul className="mt-4 flex-1 space-y-2 text-sm text-stone-400">
        {product.includes.map((item) => (
          <li key={item} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => {
          addItem(product.id, 1);
          setAdded(true);
          window.setTimeout(() => setAdded(false), 1800);
        }}
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

      <p className="mt-3 text-center text-xs text-stone-600">
        Assinantes: frete grátis na{' '}
        <Link href="/dashboard/subscription" className="text-ember hover:underline">
          próxima caixa
        </Link>
      </p>
    </article>
  );
}
