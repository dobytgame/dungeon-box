/** Cores de pista do piso de produção — um tom por ciclo, sem competir com a cor do plano. */
export type ProductionCycleVisual = {
  cycleNumber: number;
  label: string;
  laneBgClass: string;
  laneBorderClass: string;
  cardBgClass: string;
  cardBorderClass: string;
  accentBarClass: string;
  badgeClass: string;
  headingClass: string;
  swatchClass: string;
  mutedClass: string;
};

const CYCLE_THEMES: Array<Omit<ProductionCycleVisual, 'cycleNumber' | 'label'>> = [
  {
    laneBgClass: 'bg-teal-400/[0.07]',
    laneBorderClass: 'border-teal-400/35',
    cardBgClass: 'bg-teal-400/[0.12]',
    cardBorderClass: 'border-teal-400/45',
    accentBarClass: 'border-l-teal-400',
    badgeClass: 'border-teal-400/50 bg-teal-400/20 text-teal-200',
    headingClass: 'text-teal-200',
    swatchClass: 'bg-teal-400',
    mutedClass: 'text-teal-200/70',
  },
  {
    laneBgClass: 'bg-fuchsia-400/[0.07]',
    laneBorderClass: 'border-fuchsia-400/35',
    cardBgClass: 'bg-fuchsia-400/[0.12]',
    cardBorderClass: 'border-fuchsia-400/45',
    accentBarClass: 'border-l-fuchsia-400',
    badgeClass: 'border-fuchsia-400/50 bg-fuchsia-400/20 text-fuchsia-200',
    headingClass: 'text-fuchsia-200',
    swatchClass: 'bg-fuchsia-400',
    mutedClass: 'text-fuchsia-200/70',
  },
  {
    laneBgClass: 'bg-yellow-400/[0.07]',
    laneBorderClass: 'border-yellow-400/35',
    cardBgClass: 'bg-yellow-400/[0.11]',
    cardBorderClass: 'border-yellow-400/45',
    accentBarClass: 'border-l-yellow-400',
    badgeClass: 'border-yellow-400/50 bg-yellow-400/20 text-yellow-100',
    headingClass: 'text-yellow-200',
    swatchClass: 'bg-yellow-400',
    mutedClass: 'text-yellow-200/70',
  },
  {
    laneBgClass: 'bg-indigo-400/[0.08]',
    laneBorderClass: 'border-indigo-400/40',
    cardBgClass: 'bg-indigo-400/[0.13]',
    cardBorderClass: 'border-indigo-400/45',
    accentBarClass: 'border-l-indigo-400',
    badgeClass: 'border-indigo-400/50 bg-indigo-400/20 text-indigo-200',
    headingClass: 'text-indigo-200',
    swatchClass: 'bg-indigo-400',
    mutedClass: 'text-indigo-200/70',
  },
  {
    laneBgClass: 'bg-rose-400/[0.08]',
    laneBorderClass: 'border-rose-400/40',
    cardBgClass: 'bg-rose-400/[0.12]',
    cardBorderClass: 'border-rose-400/45',
    accentBarClass: 'border-l-rose-400',
    badgeClass: 'border-rose-400/50 bg-rose-400/20 text-rose-200',
    headingClass: 'text-rose-200',
    swatchClass: 'bg-rose-400',
    mutedClass: 'text-rose-200/70',
  },
  {
    laneBgClass: 'bg-lime-400/[0.07]',
    laneBorderClass: 'border-lime-400/40',
    cardBgClass: 'bg-lime-400/[0.11]',
    cardBorderClass: 'border-lime-400/45',
    accentBarClass: 'border-l-lime-400',
    badgeClass: 'border-lime-400/50 bg-lime-400/20 text-lime-200',
    headingClass: 'text-lime-200',
    swatchClass: 'bg-lime-400',
    mutedClass: 'text-lime-200/70',
  },
];

export function getProductionCycleVisual(
  cycleNumber: number
): ProductionCycleVisual {
  const n = cycleNumber >= 1 ? cycleNumber : 1;
  const theme = CYCLE_THEMES[(n - 1) % CYCLE_THEMES.length]!;
  return {
    ...theme,
    cycleNumber: n,
    label: `Ciclo ${n}`,
  };
}

export function productionCycleCardClasses(
  cycleNumber: number,
  paymentPending = false
): string {
  const visual = getProductionCycleVisual(cycleNumber);
  if (paymentPending) {
    return `border-amber-500/50 bg-amber-500/5 border-l-4 ${visual.accentBarClass}`;
  }
  return `${visual.cardBgClass} ${visual.cardBorderClass} border-l-4 ${visual.accentBarClass}`;
}
