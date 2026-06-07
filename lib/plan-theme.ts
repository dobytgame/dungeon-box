export type PlanAccent = 'silver' | 'ember' | 'frost';

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
  organicMask: string;
  organicTilt: string;
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
    organicMask: 'plan-organic-silver',
    organicTilt: '-rotate-1',
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
    organicMask: 'plan-organic-ember',
    organicTilt: 'rotate-[1.25deg]',
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
    organicMask: 'plan-organic-frost',
    organicTilt: '-rotate-[0.75deg]',
  },
};

export function getPlanTheme(accent: PlanAccent): PlanTheme {
  return themes[accent];
}
