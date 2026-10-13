import {
  COMBO_OPTIONS,
  comboGrantsFreeShipping,
  comboInterestFreeMax,
  type BillingTerm,
} from '@/lib/checkout/combo-billing';
import { estimateComboPlanTotalCents } from '@/lib/checkout/combo-display';
import { checkoutHref, type PlanSlug } from '@/lib/checkout/plans';

export type HomeV2ComboTerm = Exclude<BillingTerm, 'monthly'>;
export type HomeV2PlanMode = 'subscription' | 'combo';

export const HOME_V2_COMBO_TERMS: HomeV2ComboTerm[] = COMBO_OPTIONS.map((option) => option.term);
export const HOME_V2_DEFAULT_COMBO_TERM: HomeV2ComboTerm = 'combo_3';

export type HomeV2ComboPricing = {
  term: HomeV2ComboTerm;
  months: number;
  /** Total do combo (só o plano; frete é calculado no checkout). */
  totalCents: number;
  /** Valor equivalente por mês já com desconto. */
  perMonthCents: number;
  /** Quanto custariam os mesmos meses na mensalidade. */
  fullPriceCents: number;
  savingsCents: number;
  badge: string;
  installments: string;
  freeShipping: boolean;
  checkoutUrl: string;
  /** Texto da opção no select: "3 meses · 8% OFF". */
  optionLabel: string;
};

export function isHomeV2ComboTerm(value: string): value is HomeV2ComboTerm {
  return (HOME_V2_COMBO_TERMS as string[]).includes(value);
}

export function getHomeV2ComboPricing(
  slug: PlanSlug,
  monthlyPriceCents: number,
  term: HomeV2ComboTerm
): HomeV2ComboPricing {
  const option = COMBO_OPTIONS.find((item) => item.term === term) ?? COMBO_OPTIONS[0]!;
  const totalCents = estimateComboPlanTotalCents(monthlyPriceCents, option.term);
  const fullPriceCents = monthlyPriceCents * option.months;

  return {
    term: option.term,
    months: option.months,
    totalCents,
    perMonthCents: Math.round(totalCents / option.months),
    fullPriceCents,
    savingsCents: fullPriceCents - totalCents,
    badge: option.badge,
    installments: `até ${comboInterestFreeMax(slug, option.term)}x sem juros`,
    freeShipping: comboGrantsFreeShipping(option.term),
    checkoutUrl: checkoutHref(slug, option.term),
    optionLabel: `${option.months} meses · ${option.badge}`,
  };
}
