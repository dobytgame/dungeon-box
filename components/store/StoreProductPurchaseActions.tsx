'use client';

import { Check, ShoppingBag } from 'lucide-react';
import { homeV2ButtonClassName } from '@/components/home-v2/HomeV2Button';
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
      aria-live="polite"
      className={homeV2ButtonClassName({
        size: variant === 'panel' ? 'lg' : 'md',
        className: variant === 'card' ? 'w-full' : 'min-w-0 flex-1',
      })}
    >
      {added ? (
        <>
          <Check className="size-[1.1em] shrink-0" aria-hidden="true" />
          Adicionado
        </>
      ) : (
        <>
          <ShoppingBag className="size-[1.1em] shrink-0" aria-hidden="true" />
          <span className="truncate">{addLabel}</span>
        </>
      )}
    </button>
  );

  if (variant === 'card') {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="home-v2-display text-[11px] tracking-[0.2em] text-mesa-ash">Quantidade</p>
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
      <p className="home-v2-display text-[11px] tracking-[0.2em] text-mesa-ash">Quantidade</p>
      <div className="flex items-stretch gap-3">
        <StoreProductQuantityStepper
          value={quantity}
          max={maxQty}
          min={minQty}
          onChange={onQuantityChange}
          size="lg"
        />
        {addButton}
      </div>
    </div>
  );
}
