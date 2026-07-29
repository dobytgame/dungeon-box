import { monthKeyFromDate } from '@/lib/admin/chart-period';
import { addMonthsToMonthKey } from '@/lib/subscriptions/monthly-production-schedule';
import {
  defaultProductionMonthKey,
  mapRawMonthToProductionMonth,
  productionMonthLabel,
} from '@/lib/admin/production-month';

export function productionMonthAnchorFromPayment(paidAt: string | null): string {
  if (paidAt) {
    return mapRawMonthToProductionMonth(monthKeyFromDate(new Date(paidAt)));
  }
  return defaultProductionMonthKey();
}

export function productionMonthSlotIndex(
  productionMonthKey: string,
  paidAt: string | null
): number | null {
  const anchor = productionMonthAnchorFromPayment(paidAt);
  for (let offset = 0; offset < 48; offset += 1) {
    if (addMonthsToMonthKey(anchor, offset) === productionMonthKey) {
      return offset + 1;
    }
  }
  return null;
}

export function formatProductionMonthBadgeLabel(input: {
  productionMonthKey: string | null;
  paidAt: string | null;
  cycleNumber: number;
  compact?: boolean;
}): string {
  if (input.productionMonthKey) {
    const slot = productionMonthSlotIndex(
      input.productionMonthKey,
      input.paidAt
    );
    if (slot != null) {
      return input.compact
        ? `Mês ${slot}`
        : `Mês ${slot} · ${productionMonthLabel(input.productionMonthKey)}`;
    }
    return productionMonthLabel(input.productionMonthKey);
  }

  return `Ciclo #${input.cycleNumber}`;
}
