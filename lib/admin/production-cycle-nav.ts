import {
  buildProductionSubscriptionMeta,
  countDedupedProductionCyclesByCycle,
  filterProductionBoardRowsForCycle,
} from '@/lib/admin/production-board-filter';
import type { AdminCycleRow } from '@/lib/admin/types';
import type { CycleStatus } from '@/lib/dashboard/types';

const OPEN_PIPELINE_STATUSES = new Set<CycleStatus>([
  'upcoming',
  'production',
  'preparing',
  'packed',
  'awaiting_pickup',
  'shipped',
]);

export function parseProductionCycleNumber(
  raw: string | undefined
): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

export function productionCycleLabel(cycleNumber: number): string {
  return `Ciclo ${cycleNumber}`;
}

export function defaultProductionCycleNumber(
  rows: AdminCycleRow[]
): number {
  const meta = buildProductionSubscriptionMeta(rows);
  const counts = countDedupedProductionCyclesByCycle(rows, meta);
  const cycleNumbers = Array.from(counts.keys()).sort((a, b) => a - b);

  for (const cycleNumber of cycleNumbers) {
    const filtered = filterProductionBoardRowsForCycle(
      rows,
      cycleNumber,
      meta
    );
    if (filtered.some((row) => OPEN_PIPELINE_STATUSES.has(row.status))) {
      return cycleNumber;
    }
  }

  return 1;
}

export interface ProductionCycleNavItem {
  cycleNumber: number;
  label: string;
  count: number;
  hasOpenWork: boolean;
}

export function buildProductionCycleNavigator(
  cycles: AdminCycleRow[]
): ProductionCycleNavItem[] {
  const meta = buildProductionSubscriptionMeta(cycles);
  const counts = countDedupedProductionCyclesByCycle(cycles, meta);
  const maxFromRows = cycles.reduce(
    (max, row) => Math.max(max, row.cycle_number ?? 0),
    0
  );
  const maxCycle = Math.max(1, maxFromRows, ...Array.from(counts.keys()));

  const items: ProductionCycleNavItem[] = [];
  for (let cycleNumber = 1; cycleNumber <= maxCycle; cycleNumber += 1) {
    const filtered = filterProductionBoardRowsForCycle(
      cycles,
      cycleNumber,
      meta
    );
    items.push({
      cycleNumber,
      label: productionCycleLabel(cycleNumber),
      count: counts.get(cycleNumber) ?? 0,
      hasOpenWork: filtered.some((row) =>
        OPEN_PIPELINE_STATUSES.has(row.status)
      ),
    });
  }

  return items;
}
