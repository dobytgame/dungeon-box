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

export function checkoutHref(slug: string | PlanSlug | PlanSlug[]) {
  const slugs = Array.isArray(slug)
    ? slug.map((s) => resolvePlanSlug(s))
    : [resolvePlanSlug(slug)];
  const unique = Array.from(new Set(slugs));
  const params = new URLSearchParams();
  for (const plan of unique) {
    params.append('plan', plan);
  }
  return `/checkout?${params.toString()}`;
}

export function parseCheckoutPlanSlugs(
  searchParams: Record<string, string | string[] | undefined>
): PlanSlug[] {
  const raw = searchParams.plan;
  const values =
    raw == null ? [] : Array.isArray(raw) ? raw : [raw];
  const slugs = values.filter((value): value is PlanSlug => isPlanSlug(value));
  return slugs.length > 0 ? Array.from(new Set(slugs)) : ['heroi'];
}
