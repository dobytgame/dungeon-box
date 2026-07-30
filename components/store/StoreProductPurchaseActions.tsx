'use client';

import { Check, ShoppingCart } from 'lucide-react';
import StoreProductQuantityStepper from '@/components/store/StoreProductQuantityStepper';

interface Props {
  quantity: number;
  maxQty: number;
  minQty?: number;
  onQuantityChange: (value: number) => void;
  onAdd: () => void;
  added: boolean;
  addLabel?: string;
  addDisabled?: boolean;
  className?: string;
  /** Cards estreitos: quantidade em cima, botão largura total embaixo. */
  variant?: 'card' | 'panel';
}

export default function StoreProductPurchaseActions({
  quantity,
  maxQty,
  minQty = 1,
  onQuantityChange,
  onAdd,
  added,
  addLabel = 'Adicionar ao carrinho',
  addDisabled = false,
  className = '',
  variant = 'panel',
}: Props) {
  const addButton = (
    <button
      type="button"
      onClick={onAdd}
      disabled={addDisabled}
      className={`inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-sm bg-ember px-4 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright disabled:cursor-not-allowed disabled:opacity-50 ${
        variant === 'card' ? 'w-full' : 'min-w-0 flex-1'
      }`}
    >
      {added ? (
        <>
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          Adicionado
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{addLabel}</span>
        </>
      )}
    </button>
  );

  if (variant === 'card') {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="font-display text-[10px] uppercase tracking-widest text-stone-500">
            Quantidade
          </p>
          <StoreProductQuantityStepper
            value={quantity}
            max={maxQty}
            min={minQty}
            onChange={onQuantityChange}
          />
        </div>
        {addButton}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="font-display text-[10px] uppercase tracking-widest text-stone-500">
        Quantidade
      </p>
      <div className="flex items-stretch gap-3">
        <StoreProductQuantityStepper
          value={quantity}
          max={maxQty}
          min={minQty}
          onChange={onQuantityChange}
        />
        {addButton}
      </div>
    </div>
  );
}
