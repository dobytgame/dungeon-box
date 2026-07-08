import type { BillingTerm } from '@/lib/checkout/combo-billing';
import { isComboTerm } from '@/lib/checkout/combo-billing';

export type ComboPaymentDetail = {
  type: 'combo_prepaid' | 'combo_upgrade';
  billing_term?: BillingTerm | null;
  combo_total_cents?: number;
  combo_installments?: number;
};

export type PaymentAmountContext = {
  amount_cents: number;
  status_detail?: string | null;
  installments?: number | null;
};

export type SubscriptionAmountContext = {
  billing_term?: string | null;
  combo_total_cents?: number | null;
  combo_installments?: number | null;
};

function parsePaymentStatusDetail(
  statusDetail?: string | null
): { type?: string } | null {
  if (!statusDetail) return null;
  try {
    return JSON.parse(statusDetail) as { type?: string };
  } catch {
    return null;
  }
}

export function isComboUpgradePayment(statusDetail?: string | null): boolean {
  return parsePaymentStatusDetail(statusDetail)?.type === 'combo_upgrade';
}

export function parseComboPaymentDetail(
  statusDetail?: string | null
): ComboPaymentDetail | null {
  if (!statusDetail) return null;

  try {
    const parsed = JSON.parse(statusDetail) as ComboPaymentDetail;
    if (parsed?.type === 'combo_prepaid' || parsed?.type === 'combo_upgrade') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function isComboPrepaidPayment(statusDetail?: string | null): boolean {
  return parseComboPaymentDetail(statusDetail) !== null;
}

export function isComboInstallmentSlicePayment(
  payment: PaymentAmountContext,
  subscription?: SubscriptionAmountContext | null
): boolean {
  const detail = parsePaymentStatusDetail(payment.status_detail);
  if (detail?.type === 'combo_installment_slice') return true;
  if (isComboPrepaidPayment(payment.status_detail)) return false;

  const billingTerm = subscription?.billing_term;
  if (!billingTerm || !isComboTerm(billingTerm as BillingTerm)) return false;

  const comboTotal = subscription?.combo_total_cents ?? null;
  const comboInstallments = subscription?.combo_installments ?? 1;
  if (!comboTotal || comboTotal <= 0 || comboInstallments <= 1) return false;

  return payment.amount_cents > 0 && payment.amount_cents < comboTotal;
}

/** Valor contábil do pagamento (combo parcelado no Asaas retorna só a 1ª parcela). */
export function resolveEffectivePaymentAmountCents(
  payment: PaymentAmountContext,
  subscription?: SubscriptionAmountContext | null
): number {
  const comboDetail = parseComboPaymentDetail(payment.status_detail);
  const detailTotal =
    comboDetail?.combo_total_cents != null && comboDetail.combo_total_cents > 0
      ? comboDetail.combo_total_cents
      : null;
  const comboTotal = subscription?.combo_total_cents ?? detailTotal ?? null;

  if (comboDetail && comboTotal != null && comboTotal > 0) {
    return comboTotal;
  }

  if (comboDetail?.billing_term && isComboTerm(comboDetail.billing_term)) {
    if (comboTotal != null && comboTotal > payment.amount_cents) {
      return comboTotal;
    }
  }

  return payment.amount_cents;
}

export function resolvePaymentInstallments(
  payment: PaymentAmountContext,
  subscription?: SubscriptionAmountContext | null
): number | null {
  if (
    isComboInstallmentSlicePayment(payment, subscription) &&
    !parseComboPaymentDetail(payment.status_detail)
  ) {
    return null;
  }

  const comboDetail = parseComboPaymentDetail(payment.status_detail);
  if (!comboDetail) return payment.installments ?? null;

  const detailInstallments = comboDetail.combo_installments ?? null;
  if (detailInstallments != null && detailInstallments > 1) {
    return detailInstallments;
  }

  const comboInstallments = subscription?.combo_installments ?? null;
  if (comboInstallments != null && comboInstallments > 1) {
    return comboInstallments;
  }

  return payment.installments ?? null;
}
