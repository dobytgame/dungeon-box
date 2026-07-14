'use client';

import { Minus, Plus } from 'lucide-react';

interface Props {
  value: number;
  max: number;
  onChange: (value: number) => void;
  min?: number;
  label?: string;
  showLabel?: boolean;
}

export default function StoreProductQuantityStepper({
  value,
  max,
  onChange,
  min = 1,
  label = 'Quantidade',
  showLabel = false,
}: Props) {
  const clamped = Math.min(Math.max(value, min), max);

  return (
    <div className="shrink-0" role="group" aria-label={!showLabel ? label : undefined}>
      {showLabel ? (
        <p className="mb-2 font-display text-[10px] uppercase tracking-widest text-stone-500">
          {label}
        </p>
      ) : null}
      <div className="flex h-11 items-stretch rounded-sm border border-white/10 bg-stone-950/60">
        <button
          type="button"
          aria-label="Diminuir quantidade"
          disabled={clamped <= min}
          onClick={() => onChange(clamped - 1)}
          className="flex w-10 shrink-0 cursor-pointer items-center justify-center text-stone-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="flex min-w-[2.25rem] items-center justify-center text-sm font-medium text-white">
          {clamped}
        </span>
        <button
          type="button"
          aria-label="Aumentar quantidade"
          disabled={clamped >= max}
          onClick={() => onChange(clamped + 1)}
          className="flex w-10 shrink-0 cursor-pointer items-center justify-center text-stone-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
