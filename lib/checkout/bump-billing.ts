import { getPaintKitBump } from './order-bumps';
import { sumMonthlyCents, sumShippingCents } from './totals';
import type { CheckoutData } from './types';

export function resolveBumpBilling(data: Pick<
  CheckoutData,
  'paintKitBump' | 'paintKitBumpRecurring'
>) {
  const bump = getPaintKitBump(data.paintKitBump);
  if (!bump) {
    return { bump: null, monthlyExtraCents: 0, oneTimeExtraCents: 0 };
  }

  if (data.paintKitBumpRecurring) {
    return {
      bump,
      monthlyExtraCents: bump.priceCents,
      oneTimeExtraCents: 0,
    };
  }

  return {
    bump,
    monthlyExtraCents: 0,
    oneTimeExtraCents: bump.priceCents,
  };
}

export function sumMonthlyWithBumpCents(data: CheckoutData): number {
  const { monthlyExtraCents } = resolveBumpBilling(data);
  return sumMonthlyCents(data) + monthlyExtraCents;
}

/** Plano + adicional recorrente + frete mensal (0 se cupom/promo de frete grátis). */
export function sumRecurringCheckoutCents(data: CheckoutData): number {
  return sumMonthlyWithBumpCents(data) + sumShippingCents(data);
}
