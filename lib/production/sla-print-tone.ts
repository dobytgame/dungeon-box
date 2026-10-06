import type { ProductionSlaStatus } from '@/lib/production/sla';

export type ProductionSlaPrintTone =
  | 'green'
  | 'yellow'
  | 'red-light'
  | 'red-dark'
  | 'neutral';

/** Cores do relatório impresso (dias úteis, prazo PRODUCTION_LEAD_BUSINESS_DAYS). */
export function resolveProductionSlaPrintTone(
  sla: ProductionSlaStatus | null
): ProductionSlaPrintTone {
  if (!sla) return 'neutral';

  if (sla.overdueBusinessDays > 0) {
    return sla.overdueBusinessDays > 8 ? 'red-dark' : 'red-light';
  }

  if (sla.remainingBusinessDays >= 5) {
    return 'green';
  }

  return 'yellow';
}

export function productionSlaPrintDaysLabel(sla: ProductionSlaStatus | null): string {
  if (!sla) return '—';

  if (sla.overdueBusinessDays > 0) {
    const n = sla.overdueBusinessDays;
    return n === 1 ? '1 dia útil atrasado' : `${n} dias úteis atrasados`;
  }

  if (sla.remainingBusinessDays <= 0) {
    return 'No limite hoje';
  }

  const n = sla.remainingBusinessDays;
  return n === 1 ? '1 dia útil restante' : `${n} dias úteis restantes`;
}
