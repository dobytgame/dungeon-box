import {
  addBrazilBusinessDays,
  addBrazilDays,
  countBrazilBusinessDaysInclusive,
  formatBrazilDate,
  toBrazilDateKey,
  todayBrazilDateKey,
} from '@/lib/datetime/brazil';
import { PRODUCTION_LEAD_BUSINESS_DAYS } from '@/lib/production/lead-time';

export type ProductionSlaTone = 'green' | 'yellow' | 'red';

export type ProductionSlaStatus = {
  paidDateKey: string;
  deadlineDateKey: string;
  remainingBusinessDays: number;
  overdueBusinessDays: number;
  tone: ProductionSlaTone;
  completed: boolean;
};

const FIRST_HALF_REMAINING = Math.ceil(PRODUCTION_LEAD_BUSINESS_DAYS / 2);

function formatBusinessDays(count: number): string {
  return count === 1 ? '1 dia útil' : `${count} dias úteis`;
}

export function resolveProductionSla(input: {
  paidAt?: string | null;
  status?: string | null;
  shippedAt?: string | null;
  now?: Date;
}): ProductionSlaStatus | null {
  const paidAt = input.paidAt?.trim();
  if (!paidAt) return null;

  const paidDateKey = toBrazilDateKey(paidAt);
  if (!paidDateKey) return null;

  const deadlineDateKey = addBrazilBusinessDays(
    paidDateKey,
    PRODUCTION_LEAD_BUSINESS_DAYS
  );

  const completed = input.status === 'shipped' || input.status === 'delivered';
  const asOfKey =
    completed && input.shippedAt?.trim()
      ? toBrazilDateKey(input.shippedAt)
      : todayBrazilDateKey(input.now);

  let remainingBusinessDays = 0;
  let overdueBusinessDays = 0;
  if (asOfKey <= deadlineDateKey) {
    remainingBusinessDays = countBrazilBusinessDaysInclusive(
      asOfKey,
      deadlineDateKey
    );
  } else {
    overdueBusinessDays = countBrazilBusinessDaysInclusive(
      addBrazilDays(deadlineDateKey, 1),
      asOfKey
    );
  }

  let tone: ProductionSlaTone;
  if (completed) {
    tone = remainingBusinessDays > 0 ? 'green' : 'red';
  } else if (remainingBusinessDays <= 0) {
    tone = 'red';
  } else if (remainingBusinessDays < FIRST_HALF_REMAINING) {
    tone = 'yellow';
  } else {
    tone = 'green';
  }

  return {
    paidDateKey,
    deadlineDateKey,
    remainingBusinessDays,
    overdueBusinessDays,
    tone,
    completed,
  };
}

export function productionSlaLabel(sla: ProductionSlaStatus): string {
  if (sla.completed) {
    if (sla.tone === 'red') {
      return sla.overdueBusinessDays > 0
        ? `Atrasado · ${formatBusinessDays(sla.overdueBusinessDays)}`
        : 'Atrasado';
    }
    return 'Produzido no prazo';
  }

  if (sla.remainingBusinessDays <= 0) {
    return sla.overdueBusinessDays > 0
      ? `Atrasado · ${formatBusinessDays(sla.overdueBusinessDays)}`
      : 'Atrasado';
  }

  if (sla.remainingBusinessDays === 1) {
    return 'Último dia útil';
  }

  return `${formatBusinessDays(sla.remainingBusinessDays)} restantes`;
}

export function productionSlaTitle(sla: ProductionSlaStatus): string {
  const deadline = formatBrazilDate(sla.deadlineDateKey, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return `Prazo de produção: ${PRODUCTION_LEAD_BUSINESS_DAYS} dias úteis após o pagamento · limite ${deadline}`;
}
