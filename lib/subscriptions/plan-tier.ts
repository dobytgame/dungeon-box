import type { PlanSlug } from '@/lib/checkout/plans';
import { plans } from '@/lib/data';

const TIER_BY_SLUG: Record<PlanSlug, number> = {
  aventureiro: 1,
  heroi: 2,
  lendario: 3,
};

export function planTier(slug: string | null | undefined): number {
  if (slug && slug in TIER_BY_SLUG) {
    return TIER_BY_SLUG[slug as PlanSlug];
  }
  return 0;
}

export function isHigherPlanSlug(
  targetSlug: PlanSlug,
  currentSlug: PlanSlug
): boolean {
  return planTier(targetSlug) > planTier(currentSlug);
}

export function upgradeOptionsForSlug(currentSlug: PlanSlug): PlanSlug[] {
  const currentTier = planTier(currentSlug);
  return plans
    .filter((plan) => planTier(plan.id) > currentTier)
    .map((plan) => plan.id as PlanSlug);
}
