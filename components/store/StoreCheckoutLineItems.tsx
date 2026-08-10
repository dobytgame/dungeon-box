'use client';

import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useStoreCart } from '@/components/store/StoreCartProvider';
import { useStoreCatalog } from '@/components/store/StoreCatalogProvider';
import StoreMediaImage from '@/components/store/StoreMediaImage';
import { formatMoney } from '@/lib/dashboard/format';
import type { CartLineResolved } from '@/lib/store/cart';
import { maxQuantityForCartLine } from '@/lib/store/cart-validation';
import { STORE_PRODUCT_IMAGE_SIZE } from '@/lib/store/product-media';

interface Props {
  lines: CartLineResolved[];
  variant?: 'detailed' | 'compact';
  editable?: boolean;
}

function LineImage({
  imageUrl,
  name,
  size,
}: {
  imageUrl?: string;
  name: string;
  size: 'lg' | 'sm';
}) {
  const dimension = size === 'lg' ? 'h-16 w-16' : 'h-12 w-12';

  if (!imageUrl) {
    return (
      <div
        className={`flex ${dimension} shrink-0 items-center justify-center rounded-sm bg-stone-900`}
      >
        <ShoppingBag className="h-5 w-5 text-stone-600" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={`${dimension} shrink-0 overflow-hidden rounded-sm bg-stone-900`}>
      <StoreMediaImage
        src={imageUrl}
        alt=""
        width={STORE_PRODUCT_IMAGE_SIZE}
        height={STORE_PRODUCT_IMAGE_SIZE}
        sizes={size === 'lg' ? '64px' : '48px'}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function CheckoutQuantityControls({
  line,
  compact = false,
  maxQuantity,
  onDecrease,
  onIncrease,
  onRemove,
}: {
  line: CartLineResolved;
  compact?: boolean;
  maxQuantity: number;
  onDecrease: () => void;
  onIncrease: () => void;
  onRemove: () => void;
}) {
  const buttonSize = compact ? 'h-11 w-11' : 'h-11 w-11';
  const iconSize = compact ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${compact ? 'mt-2' : 'mt-3'}`}
    >
      <div className="flex items-center rounded-sm border border-white/10">
        <button
          type="button"
          aria-label={
            line.quantity <= 1 ? `Remover ${line.name}` : 'Diminuir quantidade'
          }
          onClick={onDecrease}
          className={`flex ${buttonSize} cursor-pointer items-center justify-center text-stone-400 transition hover:text-white`}
        >
          {line.quantity <= 1 ? (
            <Trash2 className={iconSize} />
          ) : (
            <Minus className={iconSize} />
          )}
        </button>
        <span className="min-w-[2rem] text-center text-sm text-white">
          {line.quantity}
        </span>
        <button
          type="button"
          aria-label="Aumentar quantidade"
          disabled={line.quantity >= maxQuantity}
          onClick={onIncrease}
          className={`flex ${buttonSize} cursor-pointer items-center justify-center text-stone-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <Plus className={iconSize} />
        </button>
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-stone-500 transition hover:text-red-300"
        aria-label={`Remover ${line.name}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Remover
      </button>
    </div>
  );
}

export default function StoreCheckoutLineItems({
  lines,
  variant = 'detailed',
  editable = false,
}: Props) {
  const { lines: cartLines, setQuantity, removeItem } = useStoreCart();
  const { allProducts } = useStoreCatalog();

  function decreaseQuantity(line: CartLineResolved) {
    if (line.quantity <= 1) {
      removeItem(line.lineId);
      return;
    }
    setQuantity(line.lineId, line.quantity - 1);
  }

  function increaseQuantity(line: CartLineResolved) {
    const maxQty = maxQuantityForCartLine(line, cartLines, allProducts);
    setQuantity(line.lineId, Math.min(maxQty, line.quantity + 1));
  }

  function renderControls(line: CartLineResolved, compact = false) {
    const maxQty = maxQuantityForCartLine(line, cartLines, allProducts);

    return (
      <CheckoutQuantityControls
        line={line}
        compact={compact}
        maxQuantity={maxQty}
        onDecrease={() => decreaseQuantity(line)}
        onIncrease={() => increaseQuantity(line)}
        onRemove={() => removeItem(line.lineId)}
      />
    );
  }

  if (variant === 'compact') {
    return (
      <ul className="divide-y divide-white/[0.06]">
        {lines.map((line) => (
          <li key={line.lineId} className="py-3 first:pt-0 last:pb-0">
            <div className="flex gap-3">
              <LineImage imageUrl={line.imageUrl} name={line.name} size="sm" />
              <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm leading-snug text-stone-300">
                    {!editable ? (
                      <>
                        <span className="font-medium text-white">{line.quantity}×</span>{' '}
                      </>
                    ) : null}
                    {line.name}
                  </p>
                  {line.variationSummary ? (
                    <p className="mt-1 text-xs text-stone-500">{line.variationSummary}</p>
                  ) : null}
                  {line.requiresUnitUploads && line.uploadsComplete === false ? (
                    <p className="mt-1 text-xs text-amber-200/90">
                      Imagens de personalização pendentes
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 text-sm font-medium text-white">
                  {formatMoney(line.lineTotalCents)}
                </p>
              </div>
            </div>
            {editable ? renderControls(line, true) : null}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="divide-y divide-white/[0.06]">
      {lines.map((line) => (
        <li key={line.lineId} className="flex gap-4 py-4 first:pt-0 last:pb-0">
          <LineImage imageUrl={line.imageUrl} name={line.name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium leading-snug text-white">
                  {line.name}
                </p>
                {line.themeName ? (
                  <p className="mt-1 text-xs text-gold">Tema: {line.themeName}</p>
                ) : null}
                {line.variationSummary ? (
                  <p className="mt-1 text-xs text-stone-500">{line.variationSummary}</p>
                ) : null}
              </div>
              <p className="shrink-0 font-display text-sm text-ember">
                {formatMoney(line.lineTotalCents)}
              </p>
            </div>
            {!editable ? (
              <p className="mt-2 text-xs text-stone-500">
                {line.quantity} {line.quantity === 1 ? 'unidade' : 'unidades'} ·{' '}
                {formatMoney(line.priceCents)} cada
              </p>
            ) : (
              renderControls(line)
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function storeCheckoutItemCount(lines: CartLineResolved[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}
