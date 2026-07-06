export type PlanAccent = 'silver' | 'ember' | 'frost';

export type PlanSlug = 'aventureiro' | 'heroi' | 'lendario';

export type PlanTheme = {
  accent: PlanAccent;
  nameClass: string;
  checkClass: string;
  badgeVariant: PlanAccent;
  ctaVariant: 'ember' | 'frost' | 'default';
  accentLine: string;
  accentBar: string;
  featuredText: string;
  watermark: string;
  glowOrb: string;
  specBg: string;
};

const themes: Record<PlanAccent, PlanTheme> = {
  silver: {
    accent: 'silver',
    nameClass: 'text-silver',
    checkClass: 'text-silver',
    badgeVariant: 'silver',
    ctaVariant: 'default',
    accentLine: 'bg-silver',
    accentBar: 'border-l-silver',
    featuredText: 'text-silver',
    watermark: 'text-silver',
    glowOrb: 'bg-silver/12',
    specBg: 'from-silver/5',
  },
  ember: {
    accent: 'ember',
    nameClass: 'text-gradient-ember',
    checkClass: 'text-ember',
    badgeVariant: 'ember',
    ctaVariant: 'ember',
    accentLine: 'bg-ember',
    accentBar: 'border-l-ember',
    featuredText: 'text-ember',
    watermark: 'text-ember',
    glowOrb: 'bg-ember/18',
    specBg: 'from-ember/8',
  },
  frost: {
    accent: 'frost',
    nameClass: 'text-gradient-frost',
    checkClass: 'text-frost',
    badgeVariant: 'frost',
    ctaVariant: 'frost',
    accentLine: 'bg-frost',
    accentBar: 'border-l-frost',
    featuredText: 'text-frost',
    watermark: 'text-frost',
    glowOrb: 'bg-frost/14',
    specBg: 'from-frost/8',
  },
};

export function getPlanTheme(accent: PlanAccent): PlanTheme {
  return themes[accent];
}

export const PLAN_SLUG_TO_ACCENT: Record<PlanSlug, PlanAccent> = {
  aventureiro: 'silver',
  heroi: 'ember',
  lendario: 'frost',
};

export type AdminPlanVisual = {
  slug: PlanSlug;
  accent: PlanAccent;
  label: string;
  /** Fundo suave para cards/linhas no admin */
  cardBgClass: string;
  cardBorderClass: string;
  accentBarClass: string;
  badgeClass: string;
  textClass: string;
  rowClass: string;
};

const adminPlanVisual: Record<PlanSlug, AdminPlanVisual> = {
  aventureiro: {
    slug: 'aventureiro',
    accent: 'silver',
    label: 'Aventureiro',
    cardBgClass: 'bg-silver/[0.07]',
    cardBorderClass: 'border-silver/30',
    accentBarClass: 'border-l-silver',
    badgeClass: 'border-silver/40 bg-silver/12 text-silver',
    textClass: 'text-silver',
    rowClass: 'border-b-silver/20 bg-silver/[0.04]',
  },
  heroi: {
    slug: 'heroi',
    accent: 'ember',
    label: 'Herói',
    cardBgClass: 'bg-ember/[0.09]',
    cardBorderClass: 'border-ember/35',
    accentBarClass: 'border-l-ember',
    badgeClass: 'border-ember/45 bg-ember/12 text-ember',
    textClass: 'text-ember',
    rowClass: 'border-b-ember/20 bg-ember/[0.05]',
  },
  lendario: {
    slug: 'lendario',
    accent: 'frost',
    label: 'Lendário',
    cardBgClass: 'bg-frost/[0.08]',
    cardBorderClass: 'border-frost/35',
    accentBarClass: 'border-l-frost',
    badgeClass: 'border-frost/45 bg-frost/12 text-frost',
    textClass: 'text-frost',
    rowClass: 'border-b-frost/20 bg-frost/[0.05]',
  },
};

export function isPlanSlug(value: string | null | undefined): value is PlanSlug {
  return value === 'aventureiro' || value === 'heroi' || value === 'lendario';
}

export function resolvePlanSlug(
  slug: string | null | undefined,
  planName?: string | null
): PlanSlug | null {
  if (slug && isPlanSlug(slug)) return slug;

  if (!planName) return null;
  const lower = planName.toLowerCase();
  if (lower.includes('lendár') || lower.includes('lendar')) return 'lendario';
  if (lower.includes('herói') || lower.includes('heroi')) return 'heroi';
  if (lower.includes('aventureiro')) return 'aventureiro';

  return null;
}

export function getAdminPlanVisual(
  slug: string | null | undefined,
  planName?: string | null
): AdminPlanVisual | null {
  const resolved = resolvePlanSlug(slug, planName);
  if (!resolved) return null;
  return adminPlanVisual[resolved];
}

export function adminPlanCardClasses(
  slug: string | null | undefined,
  planName?: string | null
): string {
  const visual = getAdminPlanVisual(slug, planName);
  if (!visual) return 'border-zinc-800/80 bg-zinc-950/60';
  return `${visual.cardBgClass} ${visual.cardBorderClass} border-l-2 ${visual.accentBarClass}`;
}
