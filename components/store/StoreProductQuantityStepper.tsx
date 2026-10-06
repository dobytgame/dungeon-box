'use client';

import { Minus, Plus } from 'lucide-react';

interface Props {
  value: number;
  max: number;
  onChange: (value: number) => void;
  min?: number;
  label?: string;
  showLabel?: boolean;
  /** `lg` matches the 56px primary button on the product page. */
  size?: 'md' | 'lg';
}

export default function StoreProductQuantityStepper({
  value,
  max,
  onChange,
  min = 1,
  label = 'Quantidade',
  showLabel = false,
  size = 'md',
}: Props) {
  const clamped = Math.min(Math.max(value, min), max);
  const buttonClass =
    'flex w-11 shrink-0 cursor-pointer items-center justify-center text-mesa-ash transition-colors hover:text-mesa-parchment disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="shrink-0" role="group" aria-label={!showLabel ? label : undefined}>
      {showLabel ? (
        <p className="home-v2-display mb-2 text-[11px] tracking-[0.2em] text-mesa-ash">{label}</p>
      ) : null}
      <div
        className={`flex items-stretch rounded-sm border border-white/15 bg-mesa-ink ${
          size === 'lg' ? 'h-14' : 'h-11'
        }`}
      >
        <button
          type="button"
          aria-label="Diminuir quantidade"
          disabled={clamped <= min}
          onClick={() => onChange(clamped - 1)}
          className={buttonClass}
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <span
          className="flex min-w-[2.25rem] items-center justify-center text-sm font-semibold tabular-nums text-mesa-parchment"
          aria-live="polite"
        >
          {clamped}
        </span>
        <button
          type="button"
          aria-label="Aumentar quantidade"
          disabled={clamped >= max}
          onClick={() => onChange(clamped + 1)}
          className={buttonClass}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
