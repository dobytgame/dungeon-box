'use client';

import { Sparkles } from 'lucide-react';
import {
  COMBO_OPTIONS,
  type BillingTerm,
} from '@/lib/checkout/combo-billing';
import type { CheckoutData } from '@/lib/checkout/types';
import { useCheckoutProvider } from '@/lib/checkout/use-checkout-provider';

interface Props {
  data: CheckoutData;
  setData: React.Dispatch<React.SetStateAction<CheckoutData>>;
  singlePlanOnly: boolean;
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function ComboBillingSelector({
  data,
  setData,
  singlePlanOnly,
}: Props) {
  const { provider: checkoutProvider } = useCheckoutProvider();
  if (!checkoutProvider || (checkoutProvider !== 'asaas' && checkoutProvider !== 'pagarme')) {
    return null;
  }

  const comboDisabled = !singlePlanOnly;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() =>
            setData((prev) => ({
              ...prev,
              billingTerm: 'monthly',
              installmentCount: 1,
            }))
          }
          className={`cursor-pointer rounded-sm border p-4 text-left transition-colors ${
            data.billingTerm === 'monthly'
              ? 'border-ember/50 bg-ember/10'
              : 'border-white/[0.08] bg-stone-950/40 hover:border-white/15'
          }`}
        >
          <p className="font-display text-sm uppercase tracking-widest text-white">
            Mensal
          </p>
          <p className="mt-2 text-xs leading-relaxed text-stone-500">
            Cobrança automática todo mês. Cancele quando quiser.
          </p>
        </button>

        {COMBO_OPTIONS.map((option) => {
          const selected = data.billingTerm === option.term;
          const disabled = comboDisabled;

          return (
            <button
              key={option.term}
              type="button"
              disabled={disabled}
              onClick={() =>
                setData((prev) => ({
                  ...prev,
                  billingTerm: option.term as BillingTerm,
                  installmentCount: 1,
                }))
              }
              className={`relative cursor-pointer rounded-sm border p-4 pr-20 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                selected
                  ? 'border-gold/40 bg-gold/10'
                  : 'border-white/[0.08] bg-stone-950/40 hover:border-white/15'
              }`}
            >
              <span className="absolute right-3 top-3 rounded-sm bg-gold/15 px-2 py-0.5 font-display text-[10px] uppercase tracking-widest text-gold">
                {option.badge}
              </span>
              <p className="flex items-center gap-2 font-display text-sm uppercase tracking-widest text-white">
                <Sparkles className="h-4 w-4 text-gold" aria-hidden="true" />
                {option.label}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-stone-500">
                {option.description}
              </p>
              <p className="mt-2 text-[11px] text-stone-600">
                Parcelamento em até {option.monthsPaid}x no cartão
              </p>
            </button>
          );
        })}
      </div>

      {comboDisabled ? (
        <p className="text-xs text-stone-500">
          Combos disponíveis ao assinar um plano por vez. Para múltiplos planos,
          use cobrança mensal.
        </p>
      ) : null}

      {data.billingTerm !== 'monthly' && !comboDisabled ? (
        <p className="rounded-sm border border-gold/20 bg-gold/5 px-3 py-2 text-xs text-gold/90">
          Após o combo, a renovação volta ao valor mensal normal. Parcelamento
          disponível na etapa de pagamento.
        </p>
      ) : null}
    </div>
  );
}

export { formatBRL };
