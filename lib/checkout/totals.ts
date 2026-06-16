import { plans } from '@/lib/data';
import type { CheckoutData } from '@/lib/checkout/types';
import type { PlanSlug } from '@/lib/checkout/plans';

export function getPlanPriceCents(slug: PlanSlug): number {
  const plan = plans.find((p) => p.id === slug);
  return (plan?.price ?? 0) * 100;
}

export function getEffectivePlanCents(data: CheckoutData, slug: PlanSlug): number {
  return data.discountedPlanCentsByPlan?.[slug] ?? getPlanPriceCents(slug);
}

export function sumMonthlyCents(data: CheckoutData): number {
  return data.planSlugs.reduce(
    (sum, slug) => sum + getEffectivePlanCents(data, slug),
    0
  );
}

export function sumShippingCents(data: CheckoutData): number {
  return data.planSlugs.reduce((sum, slug) => {
    const quote = data.shippingByPlan?.[slug];
    if (!quote) return sum;
    return sum + (quote.free ? 0 : quote.cents);
  }, 0);
}

export function hasAnyShippingQuote(data: CheckoutData): boolean {
  return data.planSlugs.every((slug) => data.shippingByPlan?.[slug] != null);
}
