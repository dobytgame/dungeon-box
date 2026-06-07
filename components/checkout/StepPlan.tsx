'use client';

import { Check } from 'lucide-react';
import { getPlanTheme } from '@/lib/plan-theme';
import { plans } from '@/lib/data';
import type { CheckoutData } from '@/lib/checkout/types';
import CheckoutSection from './CheckoutSection';
import OrderBumpCard from './OrderBumpCard';
import PlanSelector from './PlanSelector';

interface Props {
  data: CheckoutData;
  setData: React.Dispatch<React.SetStateAction<CheckoutData>>;
  onNext: () => void;
}

export default function StepPlan({ data, setData, onNext }: Props) {
  const plan = plans.find((p) => p.id === data.planSlug)!;
  const theme = getPlanTheme(plan.accent);
  const deliveryItems =
    'deliveryItems' in plan && Array.isArray(plan.deliveryItems)
      ? plan.deliveryItems
      : [];

  return (
    <div className="space-y-8">
      <CheckoutSection
        title="Seu plano"
        subtitle="Troque a qualquer momento antes de confirmar o pagamento."
      >
        <PlanSelector selected={data.planSlug} />
      </CheckoutSection>

      <CheckoutSection
        title="O que chega todo mês"
        subtitle="Conteúdo da caixa do plano selecionado."
      >
        <div
          className={`relative overflow-hidden rounded-sm border border-white/[0.06] bg-gradient-to-br ${theme.specBg} to-transparent p-5`}
        >
          <ul className="space-y-3">
            {deliveryItems.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm leading-relaxed text-stone-300"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-stone-950/80 ${theme.checkClass}`}
                >
                  <Check className="h-3 w-3" aria-hidden="true" />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-5 border-t border-white/[0.05] pt-4 text-xs text-stone-500">
            Peças em cinza pedra — prontas para montar e pintar na mesa.
          </p>
        </div>
      </CheckoutSection>

      <CheckoutSection
        title="Oferta na primeira caixa"
        subtitle="Kit de pintura opcional. Cobrança única, não entra na mensalidade."
      >
        <OrderBumpCard
          selected={data.paintKitBump}
          onSelect={(id) => setData((prev) => ({ ...prev, paintKitBump: id }))}
        />
      </CheckoutSection>

      <CheckoutSection title="Observações">
        <textarea
          value={data.specialNotes}
          onChange={(e) =>
            setData((prev) => ({ ...prev, specialNotes: e.target.value }))
          }
          rows={2}
          placeholder="Presente, instruções de entrega, preferências… (opcional)"
          className="w-full rounded-sm border border-white/[0.08] bg-stone-950/80 px-3 py-2.5 text-sm text-white outline-none transition-colors duration-200 placeholder:text-stone-600 focus:border-ember/40 focus:ring-1 focus:ring-ember/20"
        />
      </CheckoutSection>

      <button
        type="button"
        onClick={onNext}
        className="w-full cursor-pointer rounded-sm bg-ember py-3.5 font-display text-sm uppercase tracking-widest text-stone-950 transition-colors duration-200 hover:bg-ember-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
      >
        Continuar para entrega
      </button>
    </div>
  );
}
