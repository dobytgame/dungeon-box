'use client';

import { Check } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import StoreProductPurchaseActions from '@/components/store/StoreProductPurchaseActions';
import VarietyProductPurchasePanel from '@/components/store/VarietyProductPurchasePanel';
import MonthlyKitThemePicker from '@/components/store/MonthlyKitThemePicker';
import { useStoreCart } from '@/components/store/StoreCartProvider';
import { useAddToStoreCart } from '@/components/store/useAddToStoreCart';
import StoreMediaImage from '@/components/store/StoreMediaImage';
import type { StoreProduct } from '@/lib/store/catalog';
import { productRequiresKitTheme } from '@/lib/store/catalog';
import {
  cartLineId,
  getVariationOptionLabel,
  productHasSingleVariation,
  productHasVariations,
  validateSelectedProductOptions,
} from '@/lib/store/product-variations';
import { STORE_PRODUCTION_LEAD_TIME_LABEL } from '@/lib/store/production-lead-time';

interface Props {
  product: StoreProduct;
}

export default function StoreProductPurchasePanel({ product }: Props) {
  if (productHasSingleVariation(product)) {
    return <VarietyProductPurchasePanel product={product} />;
  }

  return <MultiVariationPurchasePanel product={product} />;
}

function MultiVariationPurchasePanel({ product }: Props) {
  const { lines, setQuantity } = useStoreCart();
  const addToCart = useAddToStoreCart(product);
  const [added, setAdded] = useState(false);
  const [localQuantity, setLocalQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const variation of product.variations ?? []) {
      const first = variation.options[0];
      initial[variation.name] = first ? getVariationOptionLabel(first) : '';
    }
    return initial;
  });
  const [selectedThemeId, setSelectedThemeId] = useState('');
  const [selectionError, setSelectionError] = useState('');

  const isMonthlyKit = product.category === 'monthly-kit';
  const requiresKitTheme = productRequiresKitTheme(product);
  const isStandaloneMonthlyKit =
    isMonthlyKit && !product.requiresSubscriptionBundle;
  const hasVariations = productHasVariations(product);
  const maxQty = product.maxQuantity ?? 9;

  const currentLine = useMemo(() => {
    if (requiresKitTheme) {
      return lines.find(
        (line) =>
          line.productId === product.id && line.themeId === selectedThemeId
      );
    }

    if (!hasVariations) {
      return lines.find((line) => line.productId === product.id);
    }

    const candidate: { productId: string; selectedOptions: Record<string, string> } = {
      productId: product.id,
      selectedOptions,
    };
    const lineId = cartLineId(candidate);
    return lines.find((line) => cartLineId(line) === lineId);
  }, [hasVariations, lines, product.id, selectedOptions, requiresKitTheme, selectedThemeId]);

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
    if (requiresKitTheme && !selectedThemeId) {
      setSelectionError('Selecione o tema do kit.');
      return;
    }

    setSelectionError('');
    addToCart(
      quantity,
      hasVariations ? selectedOptions : undefined,
      requiresKitTheme ? selectedThemeId : undefined
    );
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="mt-8 space-y-4">
      <ul className="space-y-2 text-sm text-mesa-ash">
        {product.includes.map((item) => (
          <li key={item} className="flex gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-mesa-jade" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      {requiresKitTheme ? (
        <MonthlyKitThemePicker
          themes={product.kitThemes ?? []}
          selectedThemeId={selectedThemeId}
          onChange={(themeId) => {
            setSelectedThemeId(themeId);
            setSelectionError('');
          }}
        />
      ) : null}

      {hasVariations ? (
        <div className="space-y-5 border-t border-white/10 pt-5">
          {(product.variations ?? []).map((variation) => (
            <div key={variation.name}>
              <p className="home-v2-display text-[11px] tracking-[0.2em] text-mesa-ash">
                {variation.name}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {variation.options.map((option) => {
                  const label = getVariationOptionLabel(option);
                  const selected = selectedOptions[variation.name] === label;

                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setSelectedOptions((current) => ({
                          ...current,
                          [variation.name]: label,
                        }));
                        setSelectionError('');
                      }}
                      aria-pressed={selected}
                      className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors duration-200 ${
                        selected
                          ? 'border-mesa-ember bg-mesa-ember/[0.08]'
                          : 'border-white/10 bg-mesa-stone hover:border-white/25'
                      }`}
                    >
                      <div className="size-10 shrink-0 overflow-hidden rounded-md border border-white/10 bg-mesa-ink">
                        {option.imageUrl ? (
                          <StoreMediaImage
                            src={option.imageUrl}
                            alt=""
                            width={80}
                            height={80}
                            sizes="40px"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="home-v2-display flex size-full items-center justify-center text-[11px] text-mesa-ash">
                            {label.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium text-mesa-parchment">{label}</span>
                    </button>
                  );
                })}
              </div>
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
        addDisabled={requiresKitTheme && !selectedThemeId}
        variant="panel"
      />

      <p className="text-xs leading-relaxed text-mesa-ash/80">
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
            <Link
              href="/dashboard/subscription"
              className="text-mesa-parchment underline decoration-mesa-ember/60 underline-offset-2 hover:decoration-mesa-ember"
            >
              próxima caixa
            </Link>
            .
          </>
        )}
      </p>
    </div>
  );
}
