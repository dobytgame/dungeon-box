import type { CheckoutData } from '@/lib/checkout/types';
import { sumRecurringCheckoutCents } from '@/lib/checkout/bump-billing';
import { resolveBumpBilling } from '@/lib/checkout/bump-billing';

/** Oculta pacotes combo na landing e checkout. Backend permanece ativo. */
export const COMBO_BILLING_ENABLED = false;

export const BILLING_TERMS = ['monthly', 'combo_3', 'combo_6', 'combo_12'] as const;
export type BillingTerm = (typeof BILLING_TERMS)[number];

export const COMBO_INTEREST_FREE_MAX = 4;
export const COMBO_MAX_INSTALLMENTS = 12;

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
    badge: '10% OFF',
    description: 'Pague 3 meses com 10% de desconto',
  },
  {
    term: 'combo_6',
    months: 6,
    monthsPaid: 6,
    label: 'Combo 6 meses',
    badge: '15% OFF',
    description: 'Pague 6 meses com 15% de desconto',
  },
  {
    term: 'combo_12',
    months: 12,
    monthsPaid: 11,
    label: 'Combo 12 meses',
    badge: '1 mês grátis',
    description: '12 meses de caixa — pague apenas 11',
  },
];

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
  const monthly = monthlyRecurringCents(data);
  const option = COMBO_OPTIONS.find((o) => o.term === term)!;
  let subtotal = monthly * option.monthsPaid;

  if (term === 'combo_3') {
    subtotal = Math.round(subtotal * 0.9);
  } else if (term === 'combo_6') {
    subtotal = Math.round(subtotal * 0.85);
  }

  return subtotal + comboOneTimeExtraCents(data);
}

export function calculateComboSavingsCents(
  data: CheckoutData,
  term: Exclude<BillingTerm, 'monthly'>
): number {
  const monthly = monthlyRecurringCents(data);
  const option = COMBO_OPTIONS.find((o) => o.term === term)!;
  const fullPrice =
    monthly * option.months + comboOneTimeExtraCents(data);
  return Math.max(0, fullPrice - calculateComboTotalCents(data, term));
}

export function comboInstallmentLabel(count: number): string {
  if (count <= 1) return 'À vista';
  if (count <= COMBO_INTEREST_FREE_MAX) {
    return `${count}x sem juros`;
  }
  return `${count}x com juros`;
}

export function comboAllowsInstallments(term: BillingTerm): boolean {
  return isComboTerm(term);
}
