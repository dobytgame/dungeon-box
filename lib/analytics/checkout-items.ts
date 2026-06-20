import { resolveBumpBilling, sumRecurringCheckoutCents } from '@/lib/checkout/bump-billing';
import type { PlanSlug } from '@/lib/checkout/plans';
import {
  getEffectivePlanCents,
  getPlanPriceCents,
  sumShippingCents,
} from '@/lib/checkout/totals';
import type { CheckoutData } from '@/lib/checkout/types';
import { plans } from '@/lib/data';

export type AnalyticsEcommerceItem = {
  item_id: string;
  item_name: string;
  price: number;
  item_category: string;
  quantity: number;
};

export function buildPlanSlugsEcommerceItems(
  planSlugs: PlanSlug[]
): AnalyticsEcommerceItem[] {
  return planSlugs.map((slug) => {
    const plan = plans.find((entry) => entry.id === slug);
    return {
      item_id: slug,
      item_name: plan ? `Plano ${plan.name}` : slug,
      price: getPlanPriceCents(slug) / 100,
      item_category: 'Assinatura mensal',
      quantity: 1,
    };
  });
}

export function buildCheckoutEcommerceItems(
  data: CheckoutData
): AnalyticsEcommerceItem[] {
  const items: AnalyticsEcommerceItem[] = data.planSlugs.map((slug) => {
    const plan = plans.find((entry) => entry.id === slug);
    return {
      item_id: slug,
      item_name: plan ? `Plano ${plan.name}` : slug,
      price: getEffectivePlanCents(data, slug) / 100,
      item_category: 'Assinatura mensal',
      quantity: 1,
    };
  });

  const { bump, oneTimeExtraCents, monthlyExtraCents } = resolveBumpBilling(data);

  if (bump && oneTimeExtraCents > 0) {
    items.push({
      item_id: `paint-kit-${bump.id}`,
      item_name: bump.name,
      price: oneTimeExtraCents / 100,
      item_category: 'Add-on',
      quantity: 1,
    });
  }

  if (bump && monthlyExtraCents > 0) {
    items.push({
      item_id: `paint-kit-${bump.id}-recurring`,
      item_name: `${bump.name} (mensal)`,
      price: monthlyExtraCents / 100,
      item_category: 'Add-on recorrente',
      quantity: 1,
    });
  }

  const shippingCents = sumShippingCents(data);
  if (shippingCents > 0) {
    items.push({
      item_id: 'shipping',
      item_name: 'Frete mensal',
      price: shippingCents / 100,
      item_category: 'Frete',
      quantity: 1,
    });
  }

  return items;
}

export function sumEcommerceItemsValue(items: AnalyticsEcommerceItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function buildCheckoutEcommerceValue(data: CheckoutData): number {
  if (data.shippingByPlan && Object.keys(data.shippingByPlan).length > 0) {
    return sumRecurringCheckoutCents(data) / 100;
  }

  const { oneTimeExtraCents, monthlyExtraCents } = resolveBumpBilling(data);
  const monthly = data.planSlugs.reduce(
    (sum, slug) => sum + getEffectivePlanCents(data, slug),
    0
  );
  return (monthly + oneTimeExtraCents + monthlyExtraCents) / 100;
}
