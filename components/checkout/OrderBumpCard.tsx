'use client';

import { Check, Sparkles } from 'lucide-react';
import type { PaintKitBumpId } from '@/lib/checkout/order-bumps';
import { PAINT_KIT_BUMPS } from '@/lib/checkout/order-bumps';

interface Props {
  selected: PaintKitBumpId | null;
  onSelect: (id: PaintKitBumpId | null) => void;
}

export default function OrderBumpCard({ selected, onSelect }: Props) {
  return (
    <div className="space-y-3">
      {PAINT_KIT_BUMPS.map((bump) => {
        const isSelected = selected === bump.id;
        const featured = 'featured' in bump && bump.featured;

        return (
          <button
            key={bump.id}
            type="button"
            onClick={() => onSelect(isSelected ? null : bump.id)}
            aria-pressed={isSelected}
            className={`group relative w-full cursor-pointer overflow-hidden rounded-sm border p-4 text-left transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
              isSelected
                ? 'border-gold/50 bg-gold/[0.08]'
                : 'border-white/[0.08] bg-stone-950/40 hover:border-gold/25 hover:bg-stone-950/60'
            }`}
          >
            {featured ? (
              <div
                className="pointer-events-none absolute right-0 top-0 h-16 w-16 bg-gradient-to-bl from-gold/15 to-transparent"
                aria-hidden="true"
              />
            ) : null}

            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 ${
                  isSelected
                    ? 'border-gold bg-gold text-stone-950'
                    : 'border-white/20 bg-stone-950 group-hover:border-gold/40'
                }`}
                aria-hidden="true"
              >
                {isSelected ? <Check className="h-3 w-3" /> : null}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-sm uppercase tracking-wide text-white">
                    {bump.name}
                  </p>
                  {featured ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 font-display text-[9px] uppercase tracking-widest text-gold">
                      <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                      Recomendado
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-stone-500">{bump.tagline}</p>

                <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {bump.includes.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-1.5 text-[11px] leading-snug text-stone-400"
                    >
                      <Check
                        className="mt-0.5 h-3 w-3 shrink-0 text-gold/70"
                        aria-hidden="true"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="shrink-0 text-right">
                <p className="font-display text-xl tabular-nums text-gold">
                  {bump.priceLabel}
                </p>
                <p className="text-[9px] uppercase tracking-widest text-stone-600">
                  uma vez
                </p>
              </div>
            </div>
          </button>
        );
      })}

      <p className="text-center text-[11px] text-stone-600">
        Toque novamente para remover o kit do pedido.
      </p>
    </div>
  );
}
