import { PLAN_SLUGS, type PlanSlug } from '@/lib/checkout/plans';

const PLAN_LABELS: ReadonlyArray<[PlanSlug, readonly string[]]> = [
  ['lendario', ['lendário', 'lendario']],
  ['heroi', ['herói', 'heroi']],
  ['aventureiro', ['aventureiro']],
];

export function inferPlanSlugFromText(
  text: string | null | undefined
): PlanSlug | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [slug, labels] of PLAN_LABELS) {
    if (labels.some((label) => lower.includes(label))) {
      return slug;
    }
  }
  if ((PLAN_SLUGS as readonly string[]).includes(lower.trim())) {
    return lower.trim() as PlanSlug;
  }
  return null;
}
