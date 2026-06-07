import { plans } from '@/lib/data';

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

export function checkoutHref(slug: string) {
  return `/checkout?plan=${resolvePlanSlug(slug)}`;
}
