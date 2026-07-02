import { monthKeyFromDate } from '@/lib/admin/chart-period';
import type { AdminCycleRow } from '@/lib/admin/types';
import { resolveCycleScheduledMonthKey } from '@/lib/subscriptions/combo-production-schedule';

/** Primeiro mês visível na navegação de produção. */
export const PRODUCTION_CALENDAR_START = '2026-07';

/** Pedidos de jun/2026 entram na fila de produção de jul/2026. */
const JUNE_2026_TO_JULY = '2026-06';

export function mapRawMonthToProductionMonth(monthKey: string): string {
  if (monthKey === JUNE_2026_TO_JULY) return PRODUCTION_CALENDAR_START;
  if (monthKey < PRODUCTION_CALENDAR_START) return PRODUCTION_CALENDAR_START;
  return monthKey;
}

export function defaultProductionMonthKey(now = new Date()): string {
  const current = monthKeyFromDate(now);
  if (current < PRODUCTION_CALENDAR_START) return PRODUCTION_CALENDAR_START;
  return current;
}

export function parseProductionMonthKey(raw: string | undefined): string | null {
  if (!raw || !/^\d{4}-\d{2}$/.test(raw)) return null;
  if (raw < PRODUCTION_CALENDAR_START) return PRODUCTION_CALENDAR_START;
  return raw;
}

export function productionMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function resolveProductionMonthKey(
  row: Pick<
    AdminCycleRow,
    'scheduledProductionMonth' | 'paid_at' | 'created_at'
  >
): string | null {
  const raw = resolveCycleScheduledMonthKey({
    scheduled_production_month: row.scheduledProductionMonth,
    paid_at: row.paid_at,
    created_at: row.created_at,
  });
  if (!raw) return null;
  return mapRawMonthToProductionMonth(raw);
}

export interface ProductionMonthNavItem {
  monthKey: string;
  label: string;
  count: number;
  isFuture: boolean;
}

export function buildProductionMonthNavigator(
  cycles: AdminCycleRow[]
): ProductionMonthNavItem[] {
  const currentMonthKey = monthKeyFromDate(new Date());
  const countsByMonth = new Map<string, number>();
  let maxMonthKey: string | null = null;

  for (const row of cycles) {
    const monthKey = resolveProductionMonthKey(row);
    if (!monthKey) continue;

    countsByMonth.set(monthKey, (countsByMonth.get(monthKey) ?? 0) + 1);

    if (!maxMonthKey || monthKey > maxMonthKey) {
      maxMonthKey = monthKey;
    }
  }

  const end = maxMonthKey
    ? (() => {
        const [maxYear, maxMonth] = maxMonthKey.split('-').map(Number);
        const maxDate = new Date(maxYear, maxMonth - 1, 1);
        const horizon = new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 5,
          1
        );
        return maxDate > horizon ? maxDate : horizon;
      })()
    : new Date(new Date().getFullYear(), new Date().getMonth() + 5, 1);

  const [startYear, startMonth] = PRODUCTION_CALENDAR_START.split('-').map(Number);
  const keys: string[] = [];
  let cursor = new Date(startYear, startMonth - 1, 1);

  while (cursor <= end) {
    keys.push(monthKeyFromDate(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return keys.map((monthKey) => ({
    monthKey,
    label: productionMonthLabel(monthKey),
    count: countsByMonth.get(monthKey) ?? 0,
    isFuture: monthKey > currentMonthKey,
  }));
}
