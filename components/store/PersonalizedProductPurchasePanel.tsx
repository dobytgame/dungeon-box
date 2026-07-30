'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Check, ImagePlus, Loader2, X } from 'lucide-react';
import StoreProductPurchaseActions from '@/components/store/StoreProductPurchaseActions';
import { useStoreCart } from '@/components/store/StoreCartProvider';
import type { StoreProduct } from '@/lib/store/catalog';
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
        return [
          ...current,
          ...emptySlots(quantity - current.length),
        ];
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
    addItem(product.id, quantity, {
      name: product.name,
      imageUrl: product.imageUrl,
      priceCents: product.priceCents,
      quantity,
    }, undefined, itemUploads);
    trackStoreAddToCart(product, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="mt-8 space-y-6">
      <ul className="space-y-2 text-sm text-stone-400">
        {product.includes.map((item) => (
          <li key={item} className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="rounded-sm border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="font-display text-[10px] uppercase tracking-widest text-amber-200/90">
          Pedido personalizado
        </p>
        <p className="mt-2 text-sm text-stone-400">
          Mínimo de {minQty} unidades. Envie <strong className="text-stone-200">1 imagem por item</strong>{' '}
          (JPG, PNG ou WebP, até 10 MB cada). Não é possível avançar sem todas as imagens.
        </p>
      </div>

      {!isLoggedIn ? (
        <p className="text-sm text-stone-400">
          <Link
            href={`/auth?next=${encodeURIComponent(`/loja/produto/${product.slug}`)}`}
            className="text-ember hover:underline"
          >
            Faça login
          </Link>{' '}
          para enviar as imagens e concluir o pedido.
        </p>
      ) : null}

      <div className="space-y-3">
        <p className="font-display text-[10px] uppercase tracking-widest text-stone-500">
          Imagens dos itens ({slots.filter((slot) => slot.path).length}/{quantity})
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {slots.map((slot, index) => (
            <div
              key={index}
              className="rounded-sm border border-white/10 bg-stone-950/60 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-[10px] uppercase tracking-widest text-stone-500">
                  Item {index + 1}
                </p>
                {slot.path ? (
                  <button
                    type="button"
                    onClick={() => clearSlot(index)}
                    className="cursor-pointer text-stone-500 transition hover:text-red-300"
                    aria-label={`Remover imagem do item ${index + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              {slot.previewUrl ? (
                <div className="relative mt-3 aspect-[4/3] overflow-hidden rounded-sm bg-stone-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slot.previewUrl}
                    alt={`Referência do item ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <label className="mt-3 flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-white/15 bg-stone-900/50 text-stone-500 transition hover:border-ember/40 hover:text-stone-300">
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
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  ) : (
                    <ImagePlus className="h-5 w-5" aria-hidden="true" />
                  )}
                  <span className="text-xs">
                    {slot.uploading ? 'Enviando…' : 'Selecionar imagem'}
                  </span>
                </label>
              )}

              {slot.error ? (
                <p className="mt-2 text-xs text-red-400" role="alert">
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

      <StoreProductPurchaseActions
        quantity={currentLine?.quantity ?? quantity}
        minQty={minQty}
        maxQty={maxQty}
        onQuantityChange={updateQuantity}
        onAdd={handleAdd}
        added={Boolean(currentLine) || added}
        addDisabled={!canAdd}
        addLabel="Adicionar ao carrinho"
        variant="panel"
      />

      <p className="text-xs leading-relaxed text-stone-600">
        {STORE_PRODUCTION_LEAD_TIME_LABEL}. Frete calculado por região no checkout.
      </p>
    </div>
  );
}
