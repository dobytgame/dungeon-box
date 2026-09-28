import type { CycleStatus } from '@/lib/dashboard/types';

export const LOYALTY_CYCLE_COUPON = 'TUMBA20';
export const LOYALTY_CYCLE_DISCOUNT = 20;

export const LOYALTY_MILESTONE_CYCLES = [3, 6, 9, 12] as const;

const SENT_CYCLE_STATUSES = new Set<CycleStatus>(['shipped', 'delivered']);

export function isSentSubscriptionCycle(cycle: {
  status: CycleStatus;
  shipped_at?: string | null;
}): boolean {
  return SENT_CYCLE_STATUSES.has(cycle.status) || Boolean(cycle.shipped_at);
}

export function hasSentCycle(
  cycles: Array<{
    cycle_number: number;
    status: CycleStatus;
    shipped_at?: string | null;
  }>,
  cycleNumber: number
): boolean {
  return cycles.some(
    (cycle) =>
      cycle.cycle_number === cycleNumber && isSentSubscriptionCycle(cycle)
  );
}
