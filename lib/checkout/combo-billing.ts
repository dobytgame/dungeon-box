import type { CheckoutData } from '@/lib/checkout/types';
import type { PlanSlug } from '@/lib/checkout/plans';
import {
  resolveBumpBilling,
  sumMonthlyWithBumpCents,
  sumRecurringCheckoutCents,
} from '@/lib/checkout/bump-billing';
import { sumShippingCents } from '@/lib/checkout/totals';

/** Pacotes combo na landing e checkout (3/6/12 meses). */
export const COMBO_BILLING_ENABLED = true;

export const BILLING_TERMS = ['monthly', 'combo_3', 'combo_6', 'combo_12'] as const;
export type BillingTerm = (typeof BILLING_TERMS)[number];

/** Padrão: combos de 3/6/12 meses (Aventureiro e Herói, e Lendário 3 meses). */
export const COMBO_INTEREST_FREE_MAX = 4;

/** Lendário nos combos de 6 ou 12 meses. */
export const COMBO_INTEREST_FREE_MAX_LENDARIO_LONG = 6;

export const COMBO_MAX_INSTALLMENTS = 12;

export function isLendarioLongCombo(
  planSlug: string,
  billingTerm: BillingTerm
): boolean {
  return (
    planSlug === 'lendario' &&
    (billingTerm === 'combo_6' || billingTerm === 'combo_12')
  );
}

export function comboInterestFreeMax(
  planSlug: string,
  billingTerm: BillingTerm
): number {
  if (isLendarioLongCombo(planSlug, billingTerm)) {
    return COMBO_INTEREST_FREE_MAX_LENDARIO_LONG;
  }
  return COMBO_INTEREST_FREE_MAX;
}

export function comboInterestFreeMaxForCheckout(data: CheckoutData): number {
  const planSlug = data.planSlugs[0] ?? 'heroi';
  return comboInterestFreeMax(planSlug, data.billingTerm);
}

export function comboInstallmentPromoLine(planSlug: PlanSlug): string {
  if (planSlug === 'lendario') {
    return 'Parcelamento em até 12x no cartão — até 6x sem juros nos combos de 6 e 12 meses.';
  }
  return 'Parcelamento em até 12x no cartão — até 4x sem juros.';
}

/** Desconto % sobre meses pagos × mensalidade. Combo 12 usa 1 mês grátis (monthsPaid) em vez de %. */
export const COMBO_PERCENT_OFF: Partial<
  Record<Exclude<BillingTerm, 'monthly'>, number>
> = {
  combo_3: 8,
  combo_6: 10,
};

export const COMBO_OPTIONS: Array<{
  term: Exclude<BillingTerm, 'monthly'>;
  months: number;
  monthsPaid: number;
  label: string;
  badge: string;
  description: string;
}> = [
  {
    term: 'combo_3',
    months: 3,
    monthsPaid: 3,
    label: 'Combo 3 meses',
    badge: '8% OFF',
    description: 'Pague 3 meses com 8% de desconto',
  },
  {
    term: 'combo_6',
    months: 6,
    monthsPaid: 6,
    label: 'Combo 6 meses',
    badge: '10% OFF',
    description: 'Pague 6 meses com 10% de desconto',
  },
  {
    term: 'combo_12',
    months: 12,
    monthsPaid: 11,
    label: 'Combo 12 meses',
    badge: '1 mês grátis + frete grátis',
    description: '12 meses de caixa — pague apenas 11 · frete grátis',
  },
];

export function applyComboDiscountCents(
  subtotalCents: number,
  term: Exclude<BillingTerm, 'monthly'>
): number {
  const percentOff = COMBO_PERCENT_OFF[term];
  if (!percentOff) return subtotalCents;
  return Math.round(subtotalCents * (1 - percentOff / 100));
}

/** Combo 12 meses inclui frete grátis no pacote pré-pago. */
export function comboGrantsFreeShipping(term: BillingTerm): boolean {
  return term === 'combo_12';
}

export function isComboTerm(term: BillingTerm): term is Exclude<BillingTerm, 'monthly'> {
  return term !== 'monthly';
}

export function prepaidMonthsForTerm(term: BillingTerm): number | null {
  if (term === 'monthly') return null;
  return COMBO_OPTIONS.find((o) => o.term === term)?.months ?? null;
}

/** Valor mensal recorrente (plano + frete + bump recorrente). */
export function monthlyRecurringCents(data: CheckoutData): number {
  return sumRecurringCheckoutCents(data);
}

/** Mensalidade usada no cálculo do combo (frete zerado quando o combo inclui frete grátis). */
export function comboPrepaidMonthlyCents(
  data: CheckoutData,
  term: Exclude<BillingTerm, 'monthly'>
): number {
  const planAndBump = sumMonthlyWithBumpCents(data);
  const shipping = comboGrantsFreeShipping(term) ? 0 : sumShippingCents(data);
  return planAndBump + shipping;
}

/** Adicional único da 1ª caixa (bump não recorrente). */
export function comboOneTimeExtraCents(data: CheckoutData): number {
  const { oneTimeExtraCents } = resolveBumpBilling(data);
  return oneTimeExtraCents;
}

/**
 * Total do combo antes de parcelamento.
 * Desconto aplicado sobre meses pagos × mensalidade.
 */
export function calculateComboTotalCents(
  data: CheckoutData,
  term: Exclude<BillingTerm, 'monthly'>
): number {
  const monthly = comboPrepaidMonthlyCents(data, term);
  const option = COMBO_OPTIONS.find((o) => o.term === term)!;
  const subtotal = applyComboDiscountCents(
    monthly * option.monthsPaid,
    term
  );

  return subtotal + comboOneTimeExtraCents(data);
}

export function calculateComboSavingsCents(
  data: CheckoutData,
  term: Exclude<BillingTerm, 'monthly'>
): number {
  const fullMonthly = monthlyRecurringCents(data);
  const option = COMBO_OPTIONS.find((o) => o.term === term)!;
  const fullPrice =
    fullMonthly * option.months + comboOneTimeExtraCents(data);
  return Math.max(0, fullPrice - calculateComboTotalCents(data, term));
}

export function comboInstallmentLabel(
  count: number,
  interestFreeMax: number = COMBO_INTEREST_FREE_MAX
): string {
  if (count <= 1) return 'À vista';
  if (count <= interestFreeMax) {
    return `${count}x sem juros`;
  }
  return `${count}x com juros`;
}

export function comboAllowsInstallments(term: BillingTerm): boolean {
  return isComboTerm(term);
}
