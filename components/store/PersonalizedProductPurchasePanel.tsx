'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Check, ImagePlus, Loader2, ShoppingCart, X } from 'lucide-react';
import StoreProductQuantityStepper from '@/components/store/StoreProductQuantityStepper';
import { useStoreCart } from '@/components/store/StoreCartProvider';
import type { StoreProduct } from '@/lib/store/catalog';
import { formatMoney } from '@/lib/dashboard/format';
import { cartLineId } from '@/lib/store/product-variations';
import {
  maxQuantityForProduct,
  minQuantityForProduct,
  validatePersonalizedLine,
} from '@/lib/store/personalized-product';
import { STORE_PRODUCTION_LEAD_TIME_LABEL } from '@/lib/store/production-lead-time';
import { trackStoreAddToCart } from '@/lib/analytics/store-events';

interface Props {
  product: StoreProduct;
  isLoggedIn: boolean;
}

type UploadSlot = {
  path: string | null;
  previewUrl: string | null;
  uploading: boolean;
  error: string;
};

function emptySlots(count: number): UploadSlot[] {
  return Array.from({ length: count }, () => ({
    path: null,
    previewUrl: null,
    uploading: false,
    error: '',
  }));
}

export default function PersonalizedProductPurchasePanel({
  product,
  isLoggedIn,
}: Props) {
  const { lines, addItem } = useStoreCart();
  const minQty = minQuantityForProduct(product);
  const maxQty = maxQuantityForProduct(product);
  const [quantity, setQuantity] = useState(minQty);
  const [slots, setSlots] = useState<UploadSlot[]>(() => emptySlots(minQty));
  const [added, setAdded] = useState(false);
  const [formError, setFormError] = useState('');

  const uploadedCount = slots.filter((slot) => slot.path).length;
  const lineTotalCents = product.priceCents * quantity;
  const originalLineTotalCents = product.originalPriceCents
    ? product.originalPriceCents * quantity
    : null;
  const showOriginalTotal =
    originalLineTotalCents != null && originalLineTotalCents > lineTotalCents;

  const currentLine = useMemo(() => {
    const uploads = slots
      .map((slot) => slot.path)
      .filter((path): path is string => Boolean(path));
    if (uploads.length !== quantity) return undefined;

    const candidate = {
      productId: product.id,
      itemUploads: uploads,
    };
    const lineId = cartLineId(candidate);
    return lines.find((line) => cartLineId(line) === lineId);
  }, [lines, product.id, quantity, slots]);

  useEffect(() => {
    setSlots((current) => {
      if (current.length === quantity) return current;
      if (current.length < quantity) {
        return [...current, ...emptySlots(quantity - current.length)];
      }
      for (let i = quantity; i < current.length; i += 1) {
        if (current[i]?.previewUrl) {
          URL.revokeObjectURL(current[i].previewUrl!);
        }
      }
      return current.slice(0, quantity);
    });
  }, [quantity]);

  const uploadsComplete = slots.every((slot) => Boolean(slot.path));
  const canAdd =
    uploadsComplete &&
    validatePersonalizedLine(
      product,
      quantity,
      slots.map((slot) => slot.path ?? '')
    ).ok;

  function updateQuantity(next: number) {
    const clamped = Math.min(Math.max(next, minQty), maxQty);
    setQuantity(clamped);
    setFormError('');
  }

  async function uploadFile(index: number, file: File) {
    if (!isLoggedIn) {
      setFormError('Faça login para enviar as imagens de personalização.');
      return;
    }

    setSlots((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index
          ? { ...slot, uploading: true, error: '' }
          : slot
      )
    );
    setFormError('');

    const formData = new FormData();
    formData.set('file', file);

    try {
      const response = await fetch('/api/store/customization/upload', {
        method: 'POST',
        body: formData,
      });
      const payload = (await response.json()) as {
        path?: string;
        error?: string;
      };

      if (!response.ok || !payload.path) {
        throw new Error(payload.error ?? 'Falha ao enviar imagem.');
      }

      const previewUrl = URL.createObjectURL(file);
      setSlots((current) =>
        current.map((slot, slotIndex) =>
          slotIndex === index
            ? {
                path: payload.path!,
                previewUrl,
                uploading: false,
                error: '',
              }
            : slot
        )
      );
    } catch (error) {
      setSlots((current) =>
        current.map((slot, slotIndex) =>
          slotIndex === index
            ? {
                ...slot,
                uploading: false,
                error:
                  error instanceof Error
                    ? error.message
                    : 'Falha ao enviar imagem.',
              }
            : slot
        )
      );
    }
  }

  function clearSlot(index: number) {
    setSlots((current) =>
      current.map((slot, slotIndex) => {
        if (slotIndex !== index) return slot;
        if (slot.previewUrl) URL.revokeObjectURL(slot.previewUrl);
        return {
          path: null,
          previewUrl: null,
          uploading: false,
          error: '',
        };
      })
    );
  }

  function handleAdd() {
    const itemUploads = slots
      .map((slot) => slot.path)
      .filter((path): path is string => Boolean(path));

    const validation = validatePersonalizedLine(product, quantity, itemUploads);
    if (!validation.ok) {
      setFormError(validation.error);
      return;
    }

    setFormError('');
    addItem(
      product.id,
      quantity,
      {
        name: product.name,
        imageUrl: product.imageUrl,
        priceCents: product.priceCents,
        quantity,
      },
      undefined,
      itemUploads
    );
    trackStoreAddToCart(product, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  const displayQuantity = currentLine?.quantity ?? quantity;
  const isAdded = Boolean(currentLine) || added;

  return (
    <div className="mt-8 space-y-5">
      <ul className="space-y-1.5 text-sm text-stone-400">
        {product.includes.map((item) => (
          <li key={item} className="flex gap-2">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <p className="text-xs leading-relaxed text-stone-500">
        Mínimo {minQty} un. · 1 imagem por item (JPG, PNG ou WebP, até 10 MB)
        {!isLoggedIn ? (
          <>
            {' '}
            ·{' '}
            <Link
              href={`/auth?next=${encodeURIComponent(`/loja/produto/${product.slug}`)}`}
              className="text-ember hover:underline"
            >
              Faça login
            </Link>{' '}
            para enviar
          </>
        ) : null}
      </p>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-[10px] uppercase tracking-widest text-stone-500">
            Imagens ({uploadedCount}/{quantity})
          </p>
          <div className="h-1 flex-1 max-w-[8rem] overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-ember transition-all duration-300"
              style={{ width: `${(uploadedCount / quantity) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {slots.map((slot, index) => (
            <div key={index} className="w-[4.5rem]">
              {slot.previewUrl ? (
                <div className="group relative h-[4.5rem] w-[4.5rem] overflow-hidden rounded-sm border border-white/10 bg-stone-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slot.previewUrl}
                    alt={`Item ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => clearSlot(index)}
                    className="absolute right-0.5 top-0.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-stone-950/80 text-stone-300 opacity-0 transition group-hover:opacity-100"
                    aria-label={`Remover imagem do item ${index + 1}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <span className="absolute bottom-0 left-0 right-0 bg-stone-950/75 py-0.5 text-center font-mono text-[9px] text-stone-400">
                    {index + 1}
                  </span>
                </div>
              ) : (
                <label
                  className={`flex h-[4.5rem] w-[4.5rem] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-sm border border-dashed text-stone-500 transition ${
                    slot.error
                      ? 'border-red-500/40 bg-red-500/5'
                      : 'border-white/15 bg-stone-950/40 hover:border-ember/35 hover:text-stone-300'
                  } ${!isLoggedIn || slot.uploading ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={!isLoggedIn || slot.uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (file) void uploadFile(index, file);
                    }}
                  />
                  {slot.uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="font-mono text-[9px]">{index + 1}</span>
                </label>
              )}
              {slot.error ? (
                <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-red-400">
                  {slot.error}
                </p>
              ) : null}
            </div>
          ))}
        </div>
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
              Quantidade
            </p>
            <div className="mt-2">
              <StoreProductQuantityStepper
                value={displayQuantity}
                min={minQty}
                max={maxQty}
                onChange={updateQuantity}
              />
            </div>
          </div>

          <div className="text-right">
            <p className="font-display text-[10px] uppercase tracking-widest text-stone-500">
              Total do pedido
            </p>
            <p className="mt-1 text-xs text-stone-500">
              {formatMoney(product.priceCents)} × {displayQuantity}
            </p>
            <div className="mt-0.5 flex flex-wrap items-baseline justify-end gap-2">
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
          disabled={!canAdd || isAdded}
          className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-sm bg-ember px-4 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[14rem]"
        >
          {isAdded ? (
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

        {!canAdd && uploadedCount < quantity ? (
          <p className="text-xs text-stone-600">
            Envie as {quantity - uploadedCount} imagem(ns) restante(s) para continuar.
          </p>
        ) : null}
      </div>

      <p className="text-xs leading-relaxed text-stone-600">
        {STORE_PRODUCTION_LEAD_TIME_LABEL}. Frete calculado por região no checkout.
      </p>
    </div>
  );
}
