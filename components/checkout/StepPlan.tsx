'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { getPlanTheme } from '@/lib/plan-theme';
import { plans } from '@/lib/data';
import type { CheckoutData } from '@/lib/checkout/types';
import type { PlanSlug } from '@/lib/checkout/plans';
import CheckoutSection from './CheckoutSection';
import CouponField from './CouponField';
import OrderBumpCard from './OrderBumpCard';
import PlanSelector from './PlanSelector';

interface Props {
  data: CheckoutData;
  setData: React.Dispatch<React.SetStateAction<CheckoutData>>;
  activePlanSlugs?: PlanSlug[];
  onPlanSlugsChange: (slugs: PlanSlug[]) => void;
  onNext: () => void;
}

export default function StepPlan({
  data,
  setData,
  activePlanSlugs = [],
  onPlanSlugsChange,
  onNext,
}: Props) {
  const [couponError, setCouponError] = useState('');
  const primaryPlanSlug = data.planSlugs[0] ?? 'heroi';
  const plan = plans.find((p) => p.id === primaryPlanSlug)!;
  const theme = getPlanTheme(plan.accent);
  const selectableSelected = data.planSlugs.filter(
    (slug) => !activePlanSlugs.includes(slug)
  );
  const deliveryItems =
    'deliveryItems' in plan && Array.isArray(plan.deliveryItems)
      ? plan.deliveryItems
      : [];

  return (
    <div className="space-y-8">
      <CheckoutSection
        title="Seus planos"
        subtitle="Escolha um ou mais planos antes de confirmar o pagamento."
      >
        <PlanSelector
          selected={data.planSlugs}
          activePlanSlugs={activePlanSlugs}
          onChange={onPlanSlugsChange}
        />
      </CheckoutSection>

      {selectableSelected.length === 0 ? (
        <p
          className="rounded-sm border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90"
          role="status"
        >
          Você já assina todos os planos disponíveis. Gerencie suas assinaturas
          em{' '}
          <a href="/dashboard/subscription" className="text-ember hover:underline">
            Minha conta
          </a>
          .
        </p>
      ) : null}

      <CheckoutSection
        title="Cupom de desconto"
        subtitle="Opcional — válido para os planos elegíveis selecionados."
      >
        <CouponField
          planSlugs={selectableSelected.length > 0 ? selectableSelected : data.planSlugs}
          couponCode={data.couponCode ?? null}
          couponSummary={data.couponSummary ?? null}
          onApply={(result) => {
            setCouponError('');
            setData((prev) => ({
              ...prev,
              couponCode: result.code,
              couponSummary: result.summary,
              discountedPlanCentsByPlan: result.discountedPlanCentsByPlan,
              shippingByPlan: undefined,
            }));
          }}
          onRemove={() => {
            setCouponError('');
            setData((prev) => ({
              ...prev,
              couponCode: null,
              couponSummary: null,
              discountedPlanCentsByPlan: undefined,
              shippingByPlan: undefined,
            }));
          }}
          onError={setCouponError}
        />
        {couponError ? (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {couponError}
          </p>
        ) : null}
      </CheckoutSection>

      <CheckoutSection
        title="O que chega todo mês"
        subtitle={
          data.planSlugs.length > 1
            ? `Conteúdo de referência do plano ${plan.name}. Cada assinatura segue o tier escolhido.`
            : 'Conteúdo da caixa do plano selecionado.'
        }
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
        subtitle="Kit de pintura opcional. Cobrança única na 1ª caixa ou recorrente todo mês."
      >
        <OrderBumpCard
          selected={data.paintKitBump}
          recurring={data.paintKitBumpRecurring}
          onSelect={(id) =>
            setData((prev) => ({
              ...prev,
              paintKitBump: id,
              paintKitBumpRecurring: id ? prev.paintKitBumpRecurring : false,
            }))
          }
          onRecurringChange={(recurring) =>
            setData((prev) => ({ ...prev, paintKitBumpRecurring: recurring }))
          }
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
        disabled={selectableSelected.length === 0}
        className="w-full cursor-pointer rounded-sm bg-ember py-3.5 font-display text-sm uppercase tracking-widest text-stone-950 transition-colors duration-200 hover:bg-ember-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continuar para entrega
      </button>
    </div>
  );
}
