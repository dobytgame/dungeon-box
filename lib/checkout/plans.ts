import { plans } from '@/lib/data';
import type { BillingTerm } from '@/lib/checkout/combo-billing';
import { COMBO_BILLING_ENABLED, isComboTerm } from '@/lib/checkout/combo-billing';

export const PLAN_SLUGS = ['aventureiro', 'heroi', 'lendario'] as const;
export type PlanSlug = (typeof PLAN_SLUGS)[number];

export function isPlanSlug(value: string): value is PlanSlug {
  return (PLAN_SLUGS as readonly string[]).includes(value);
}

export function resolvePlanSlug(raw: string | null | undefined): PlanSlug {
  if (raw && isPlanSlug(raw)) return raw;
  return 'heroi';
}

export function getCheckoutPlan(slug: PlanSlug) {
  return plans.find((p) => p.id === slug)!;
}

export function checkoutHref(
  slug: string | PlanSlug | PlanSlug[],
  combo?: Exclude<BillingTerm, 'monthly'>
) {
  const slugs = Array.isArray(slug)
    ? slug.map((s) => resolvePlanSlug(s))
    : [resolvePlanSlug(slug)];
  const unique = Array.from(new Set(slugs));
  const params = new URLSearchParams();
  for (const plan of unique) {
    params.append('plan', plan);
  }
  if (combo && COMBO_BILLING_ENABLED) {
    params.set('combo', combo);
  }
  return `/checkout?${params.toString()}`;
}

export function parseCheckoutPlanSlugs(
  searchParams: Record<string, string | string[] | undefined>
): PlanSlug[] {
  const raw = searchParams.plan;
  const values = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
  const slugs = values.filter((value): value is PlanSlug => isPlanSlug(value));
  return slugs.length > 0 ? Array.from(new Set(slugs)) : ['heroi'];
}

export function parseCheckoutBillingTerm(
  searchParams: Record<string, string | string[] | undefined>
): BillingTerm {
  if (!COMBO_BILLING_ENABLED) return 'monthly';

  const raw = searchParams.combo;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value && isComboTerm(value as BillingTerm)) {
    return value as BillingTerm;
  }
  return 'monthly';
}
