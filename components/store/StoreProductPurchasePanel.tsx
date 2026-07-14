'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import StoreProductPurchaseActions from '@/components/store/StoreProductPurchaseActions';
import { useStoreCart } from '@/components/store/StoreCartProvider';
import { useAddToStoreCart } from '@/components/store/useAddToStoreCart';
import type { StoreProduct } from '@/lib/store/catalog';
import {
  cartLineId,
  productHasVariations,
  validateSelectedProductOptions,
} from '@/lib/store/product-variations';
import { STORE_PRODUCTION_LEAD_TIME_LABEL } from '@/lib/store/production-lead-time';

interface Props {
  product: StoreProduct;
}

export default function StoreProductPurchasePanel({ product }: Props) {
  const { lines, setQuantity } = useStoreCart();
  const addToCart = useAddToStoreCart(product);
  const [added, setAdded] = useState(false);
  const [localQuantity, setLocalQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const variation of product.variations ?? []) {
      initial[variation.name] = variation.options[0] ?? '';
    }
    return initial;
  });
  const [selectionError, setSelectionError] = useState('');

  const isMonthlyKit = product.category === 'monthly-kit';
  const isStandaloneMonthlyKit =
    isMonthlyKit && !product.requiresSubscriptionBundle;
  const hasVariations = productHasVariations(product);
  const maxQty = product.maxQuantity ?? 9;

  const currentLine = useMemo(() => {
    if (!hasVariations) {
      return lines.find((line) => line.productId === product.id);
    }

    const candidate: { productId: string; selectedOptions: Record<string, string> } = {
      productId: product.id,
      selectedOptions,
    };
    const lineId = cartLineId(candidate);
    return lines.find((line) => cartLineId(line) === lineId);
  }, [hasVariations, lines, product.id, selectedOptions]);

  const quantity = currentLine?.quantity ?? localQuantity;

  function updateQuantity(next: number) {
    const clamped = Math.min(Math.max(next, 1), maxQty);
    if (currentLine) {
      setQuantity(cartLineId(currentLine), clamped);
    } else {
      setLocalQuantity(clamped);
    }
  }

  function handleAdd() {
    const validation = validateSelectedProductOptions(product, selectedOptions);
    if (!validation.ok) {
      setSelectionError(validation.error);
      return;
    }

    setSelectionError('');
    addToCart(quantity, hasVariations ? selectedOptions : undefined);
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

      {hasVariations ? (
        <div className="space-y-4 border-t border-white/[0.06] pt-4">
          {(product.variations ?? []).map((variation) => (
            <div key={variation.name}>
              <label
                htmlFor={`variation-${variation.name}`}
                className="font-display text-[10px] uppercase tracking-widest text-stone-500"
              >
                {variation.name}
              </label>
              <select
                id={`variation-${variation.name}`}
                value={selectedOptions[variation.name] ?? ''}
                onChange={(event) => {
                  setSelectedOptions((current) => ({
                    ...current,
                    [variation.name]: event.target.value,
                  }));
                  setSelectionError('');
                }}
                className="mt-2 w-full rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white"
              >
                {variation.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      ) : null}

      {selectionError ? (
        <p className="text-sm text-red-400" role="alert">
          {selectionError}
        </p>
      ) : null}

      <StoreProductPurchaseActions
        quantity={quantity}
        maxQty={maxQty}
        onQuantityChange={updateQuantity}
        onAdd={handleAdd}
        added={added}
        addLabel={isMonthlyKit ? 'Adicionar' : 'Adicionar ao carrinho'}
        variant="panel"
      />

      <p className="text-xs leading-relaxed text-stone-600">
        {STORE_PRODUCTION_LEAD_TIME_LABEL}.{' '}
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
            {' '}
            Assinantes: frete grátis na{' '}
            <Link href="/dashboard/subscription" className="text-ember hover:underline">
              próxima caixa
            </Link>
            .
          </>
        )}
      </p>
    </div>
  );
}
