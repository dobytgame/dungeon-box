'use client';

import {
  COMBO_INTEREST_FREE_MAX,
  COMBO_MAX_INSTALLMENTS,
  comboInstallmentLabel,
} from '@/lib/checkout/combo-billing';

interface Props {
  value: number;
  onChange: (count: number) => void;
  totalCents: number;
  interestFreeMax?: number;
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function InstallmentSelector({
  value,
  onChange,
  totalCents,
  interestFreeMax = COMBO_INTEREST_FREE_MAX,
}: Props) {
  const options = Array.from({ length: COMBO_MAX_INSTALLMENTS }, (_, i) => i + 1);

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-400">
        Total do combo:{' '}
        <span className="font-display text-white">{formatBRL(totalCents)}</span>
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {options.map((count) => {
          const selected = value === count;
          const installmentCents = Math.round(totalCents / count);

          return (
            <button
              key={count}
              type="button"
              onClick={() => onChange(count)}
              className={`cursor-pointer rounded-sm border px-3 py-3 text-left transition-colors ${
                selected
                  ? 'border-ember/50 bg-ember/10'
                  : 'border-white/[0.08] bg-stone-950/40 hover:border-white/15'
              }`}
            >
              <p className="font-display text-xs uppercase tracking-widest text-white">
                {comboInstallmentLabel(count, interestFreeMax)}
              </p>
              <p className="mt-1 text-[11px] text-stone-500">
                {formatBRL(installmentCents)}/parcela
              </p>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] leading-relaxed text-stone-600">
        Até {interestFreeMax}x sem juros. Acima disso, o valor da parcela pode
        incluir juros da operadora do cartão.
      </p>
    </div>
  );
}
