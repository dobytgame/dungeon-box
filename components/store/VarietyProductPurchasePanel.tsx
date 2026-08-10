'use client';

import { Check, ShoppingCart } from 'lucide-react';
import { useMemo, useState } from 'react';
import StoreProductQuantityStepper from '@/components/store/StoreProductQuantityStepper';
import { useStoreCart } from '@/components/store/StoreCartProvider';
import StoreMediaImage from '@/components/store/StoreMediaImage';
import type { StoreProduct } from '@/lib/store/catalog';
import { formatMoney } from '@/lib/dashboard/format';
import { trackStoreAddToCart } from '@/lib/analytics/store-events';
import { minQuantityForProduct, maxQuantityForProduct } from '@/lib/store/personalized-product';
import {
  formatProductNameWithVariations,
  getVariationOptionLabel,
  productHasSingleVariation,
  resolveSelectedVariationImage,
  validateSelectedProductOptions,
} from '@/lib/store/product-variations';
import { STORE_PRODUCTION_LEAD_TIME_LABEL } from '@/lib/store/production-lead-time';
import {
  maxQuantityForVarietyOption,
  validateVarietyPoolTotal,
} from '@/lib/store/variety-quantity-pool';

interface Props {
  product: StoreProduct;
}

export default function VarietyProductPurchasePanel({ product }: Props) {
  const { addItem } = useStoreCart();
  const variation = product.variations?.[0];
  const minQty = minQuantityForProduct(product);
  const maxQty = maxQuantityForProduct(product);
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const option of variation?.options ?? []) {
      initial[getVariationOptionLabel(option)] = 0;
    }
    return initial;
  });
  const [added, setAdded] = useState(false);
  const [formError, setFormError] = useState('');

  const selectedLines = useMemo(() => {
    if (!variation) return [];

    return variation.options.flatMap((option) => {
      const label = getVariationOptionLabel(option);
      const quantity = quantities[label] ?? 0;
      if (quantity <= 0) return [];

      const selectedOptions = { [variation.name]: label };
      return [{ label, quantity, selectedOptions, option }];
    });
  }, [quantities, variation]);

  const totalQuantity = selectedLines.reduce((sum, line) => sum + line.quantity, 0);
  const lineTotalCents = product.priceCents * totalQuantity;
  const originalLineTotalCents = product.originalPriceCents
    ? product.originalPriceCents * totalQuantity
    : null;
  const showOriginalTotal =
    originalLineTotalCents != null && originalLineTotalCents > lineTotalCents;
  const remainingToMin = Math.max(0, minQty - totalQuantity);
  const meetsMinimum = totalQuantity >= minQty;

  if (!productHasSingleVariation(product) || !variation) {
    return null;
  }

  function updateQuantity(label: string, next: number) {
    const current = quantities[label] ?? 0;
    const maxForOption = maxQuantityForVarietyOption(
      product,
      totalQuantity,
      current
    );
    const clamped = Math.min(Math.max(next, 0), maxForOption);
    setQuantities((currentQuantities) => ({
      ...currentQuantities,
      [label]: clamped,
    }));
    setFormError('');
  }

  function handleAdd() {
    if (totalQuantity === 0) {
      setFormError(
        minQty > 1
          ? `Selecione no mínimo ${minQty} unidades no total (pode combinar as variedades).`
          : 'Selecione ao menos uma variedade com quantidade maior que zero.'
      );
      return;
    }

    const poolValidation = validateVarietyPoolTotal(product, totalQuantity);
    if (!poolValidation.ok) {
      setFormError(poolValidation.error);
      return;
    }

    for (const line of selectedLines) {
      const validation = validateSelectedProductOptions(product, line.selectedOptions);
      if (!validation.ok) {
        setFormError(validation.error);
        return;
      }
    }

    setFormError('');

    for (const line of selectedLines) {
      const displayName = formatProductNameWithVariations(
        product.name,
        line.selectedOptions
      );
      const imageUrl =
        resolveSelectedVariationImage(product, line.selectedOptions) ??
        product.imageUrl;

      addItem(
        product.id,
        line.quantity,
        {
          name: displayName,
          imageUrl,
          priceCents: product.priceCents,
          quantity: line.quantity,
        },
        line.selectedOptions
      );
      trackStoreAddToCart(product, line.quantity);
    }

    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="mt-8 space-y-5">
      <ul className="space-y-2 text-sm text-stone-400">
        {product.includes.map((item) => (
          <li key={item} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="space-y-3 border-t border-white/[0.06] pt-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-display text-[10px] uppercase tracking-widest text-stone-500">
              {variation.name}
            </p>
            {minQty > 1 ? (
              <p className="mt-1 text-xs text-stone-500">
                Mínimo {minQty} un. no total · máx. {maxQty} un.
              </p>
            ) : null}
          </div>
          {totalQuantity > 0 ? (
            <p
              className={`text-xs ${
                meetsMinimum ? 'text-stone-500' : 'text-amber-400/90'
              }`}
            >
              {totalQuantity} / {minQty > 1 ? minQty : maxQty}{' '}
              {totalQuantity === 1 ? 'unidade' : 'unidades'}
              {!meetsMinimum && minQty > 1
                ? ` · faltam ${remainingToMin}`
                : ''}
            </p>
          ) : null}
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {variation.options.map((option) => {
            const label = getVariationOptionLabel(option);
            const quantity = quantities[label] ?? 0;
            const optionMax = maxQuantityForVarietyOption(
              product,
              totalQuantity,
              quantity
            );

            return (
              <li
                key={label}
                className={`rounded-sm border p-3 transition ${
                  quantity > 0
                    ? 'border-ember/40 bg-ember/5'
                    : 'border-white/10 bg-stone-950/40'
                }`}
              >
                <div className="flex gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-sm border border-white/10 bg-stone-900">
                    {option.imageUrl ? (
                      <StoreMediaImage
                        src={option.imageUrl}
                        alt={label}
                        width={128}
                        height={128}
                        sizes="64px"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] text-stone-600">
                        {label.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm text-white">{label}</p>
                    <p className="mt-0.5 text-xs text-stone-500">
                      {formatMoney(product.priceCents)} / un.
                    </p>
                    <div className="mt-2">
                      <StoreProductQuantityStepper
                        value={quantity}
                        min={0}
                        max={optionMax}
                        onChange={(next) => updateQuantity(label, next)}
                      />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {formError ? (
        <p className="text-sm text-red-400" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="space-y-3 border-t border-white/[0.06] pt-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-[10px] uppercase tracking-widest text-stone-500">
              Total selecionado
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {totalQuantity > 0
                ? `${formatMoney(product.priceCents)} × ${totalQuantity}`
                : minQty > 1
                  ? `Combine as variedades até atingir o mínimo de ${minQty} un.`
                  : 'Escolha as quantidades acima'}
            </p>
          </div>

          <div className="text-right">
            <div className="flex flex-wrap items-baseline justify-end gap-2">
              {showOriginalTotal ? (
                <span className="font-display text-sm text-stone-500 line-through">
                  {formatMoney(originalLineTotalCents!)}
                </span>
              ) : null}
              <p className="font-display text-2xl text-ember">
                {formatMoney(lineTotalCents)}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={added}
          className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-sm bg-ember px-4 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[14rem]"
        >
          {added ? (
            <>
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              Adicionado
            </>
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden="true" />
              Adicionar ao carrinho
            </>
          )}
        </button>
      </div>

      <p className="text-xs leading-relaxed text-stone-600">
        {STORE_PRODUCTION_LEAD_TIME_LABEL}. Frete calculado por região no checkout.
      </p>
    </div>
  );
}
