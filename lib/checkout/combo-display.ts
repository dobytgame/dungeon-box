import type { BillingTerm } from '@/lib/checkout/combo-billing';
import {
  COMBO_OPTIONS,
  comboInstallmentLabel,
  isComboTerm,
} from '@/lib/checkout/combo-billing';

export function getComboTermLabel(term: BillingTerm): string {
  switch (term) {
    case 'combo_3':
      return 'Combo 3 meses';
    case 'combo_6':
      return 'Combo 6 meses';
    case 'combo_12':
      return 'Combo 12 meses';
    default:
      return 'Mensal';
  }
}

export function getComboTermBadge(term: Exclude<BillingTerm, 'monthly'>): string {
  return COMBO_OPTIONS.find((o) => o.term === term)?.badge ?? '';
}

/** Estimativa só do plano (frete calculado no checkout). */
export function estimateComboPlanTotalCents(
  monthlyPlanCents: number,
  term: Exclude<BillingTerm, 'monthly'>
): number {
  const option = COMBO_OPTIONS.find((o) => o.term === term)!;
  let subtotal = monthlyPlanCents * option.monthsPaid;
  if (term === 'combo_3') subtotal = Math.round(subtotal * 0.9);
  if (term === 'combo_6') subtotal = Math.round(subtotal * 0.85);
  return subtotal;
}

export function formatComboSavingsPercent(
  term: Exclude<BillingTerm, 'monthly'>
): string {
  return getComboTermBadge(term);
}

export type SubscriptionComboFields = {
  billing_term?: string | null;
  prepaid_until?: string | null;
  prepaid_months?: number | null;
  combo_total_cents?: number | null;
  combo_installments?: number | null;
  next_billing_date?: string | null;
  status?: string | null;
};

export type SubscriptionComboSummary = {
  isCombo: boolean;
  label: string;
  isPrepaidActive: boolean;
  prepaidUntil: string | null;
  prepaidMonths: number | null;
  comboTotalCents: number | null;
  installmentLabel: string | null;
  nextBillingLabel: string;
};

export function getSubscriptionComboSummary(
  subscription: SubscriptionComboFields
): SubscriptionComboSummary | null {
  const term = (subscription.billing_term ?? 'monthly') as BillingTerm;
  if (!isComboTerm(term)) return null;

  const prepaidUntil = subscription.prepaid_until ?? null;
  const isPrepaidActive =
    Boolean(prepaidUntil) && new Date(prepaidUntil!) > new Date();

  const installmentCount = subscription.combo_installments ?? 1;

  return {
    isCombo: true,
    label: getComboTermLabel(term),
    isPrepaidActive,
    prepaidUntil,
    prepaidMonths: subscription.prepaid_months ?? null,
    comboTotalCents: subscription.combo_total_cents ?? null,
    installmentLabel:
      installmentCount > 1 ? comboInstallmentLabel(installmentCount) : null,
    nextBillingLabel: isPrepaidActive
      ? 'Renovação mensal após o combo'
      : 'Cobrança mensal',
  };
}
