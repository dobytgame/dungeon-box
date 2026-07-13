'use client';

import { Star } from 'lucide-react';

interface Props {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
}

export default function StarRating({
  value,
  onChange,
  disabled = false,
  label = 'Sua nota',
}: Props) {
  return (
    <div>
      <p className="mb-3 text-xs uppercase tracking-widest text-stone-500">{label}</p>
      <div
        className="flex gap-2"
        role="radiogroup"
        aria-label={label}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const active = star <= value;
          return (
            <button
              key={star}
              type="button"
              disabled={disabled}
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
              onClick={() => onChange(star)}
              className={`inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-sm border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? 'border-gold/40 bg-gold/10 text-gold'
                  : 'border-white/10 text-stone-500 hover:border-white/20 hover:text-stone-300'
              }`}
            >
              <Star
                className="h-5 w-5"
                fill={active ? 'currentColor' : 'none'}
                strokeWidth={active ? 0 : 2}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
