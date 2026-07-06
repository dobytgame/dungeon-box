import type { BillingTerm } from '@/lib/checkout/combo-billing';
import { isComboTerm } from '@/lib/checkout/combo-billing';
import type { AdminCycleRow } from '@/lib/admin/types';
import { resolveProductionMonthKey } from '@/lib/admin/production-month';
import type { CycleStatus } from '@/lib/dashboard/types';
import { pipelineStepIndex } from '@/lib/subscriptions/cycle-production';

export const OPERATIONAL_SUBSCRIPTION_STATUSES = new Set([
  'active',
  'past_due',
]);

const SUBSCRIPTION_STATUS_PRIORITY = [
  'active',
  'past_due',
  'paused',
  'pending',
] as const;

const OPEN_CYCLE_STATUSES: CycleStatus[] = [
  'upcoming',
  'production',
  'preparing',
  'shipped',
];

export type ProductionSubscriptionMeta = {
  userId: string | null;
  status: string;
  currentCycle: number;
};

function subscriptionPriority(status: string): number {
  const index = SUBSCRIPTION_STATUS_PRIORITY.indexOf(
    status as (typeof SUBSCRIPTION_STATUS_PRIORITY)[number]
  );
  return index >= 0 ? index : SUBSCRIPTION_STATUS_PRIORITY.length;
}

function isPrematureUpcoming(
  row: AdminCycleRow,
  siblings: AdminCycleRow[]
): boolean {
  if (row.status !== 'upcoming' || row.paid_at) return false;

  return siblings.some(
    (other) =>
      other.id !== row.id &&
      other.cycle_number < row.cycle_number &&
      OPEN_CYCLE_STATUSES.includes(other.status)
  );
}

function pickPrimaryOpenCycle(rows: AdminCycleRow[]): AdminCycleRow | null {
  if (rows.length === 0) return null;

  return [...rows].sort((a, b) => {
    const stepDiff = pipelineStepIndex(b.status) - pipelineStepIndex(a.status);
    if (stepDiff !== 0) return stepDiff;
    return a.cycle_number - b.cycle_number;
  })[0] ?? null;
}

function pickLatestDelivered(rows: AdminCycleRow[]): AdminCycleRow | null {
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => b.cycle_number - a.cycle_number)[0] ?? null;
}

function filterRowsForSubscription(rows: AdminCycleRow[]): AdminCycleRow[] {
  const open = rows.filter((row) => OPEN_CYCLE_STATUSES.includes(row.status));
  const delivered = rows.filter((row) => row.status === 'delivered');
  const primaryOpen = pickPrimaryOpenCycle(open);

  if (primaryOpen) return [primaryOpen];

  const latestDelivered = pickLatestDelivered(delivered);
  return latestDelivered ? [latestDelivered] : [];
}

function keepPrimarySubscriptionPerUser(
  rows: AdminCycleRow[],
  metaBySubscriptionId: Map<string, ProductionSubscriptionMeta>
): AdminCycleRow[] {
  const subscriptionIdsByUser = new Map<string, Set<string>>();

  for (const row of rows) {
    const userId = metaBySubscriptionId.get(row.subscription_id)?.userId;
    if (!userId) continue;
    const current = subscriptionIdsByUser.get(userId) ?? new Set<string>();
    current.add(row.subscription_id);
    subscriptionIdsByUser.set(userId, current);
  }

  const allowedSubscriptionIds = new Set<string>();

  for (const subscriptionIds of Array.from(subscriptionIdsByUser.values())) {
    if (subscriptionIds.size <= 1) {
      subscriptionIds.forEach((id: string) => allowedSubscriptionIds.add(id));
      continue;
    }

    const ranked = Array.from(subscriptionIds).sort((a: string, b: string) => {
      const metaA = metaBySubscriptionId.get(a);
      const metaB = metaBySubscriptionId.get(b);
      const priorityDiff =
        subscriptionPriority(metaA?.status ?? '') -
        subscriptionPriority(metaB?.status ?? '');
      if (priorityDiff !== 0) return priorityDiff;
      return (metaB?.currentCycle ?? 0) - (metaA?.currentCycle ?? 0);
    });

    if (ranked[0]) allowedSubscriptionIds.add(ranked[0]);
  }

  return rows.filter((row) => {
    const userId = metaBySubscriptionId.get(row.subscription_id)?.userId;
    if (!userId) return true;
    return allowedSubscriptionIds.has(row.subscription_id);
  });
}

export function buildProductionSubscriptionMeta(
  rows: AdminCycleRow[]
): Map<string, ProductionSubscriptionMeta> {
  const metaBySubscriptionId = new Map<string, ProductionSubscriptionMeta>();
  for (const row of rows) {
    if (!metaBySubscriptionId.has(row.subscription_id)) {
      metaBySubscriptionId.set(row.subscription_id, {
        userId: row.userId,
        status: row.subscriptionStatus ?? 'pending',
        currentCycle: row.subscriptionCurrentCycle ?? 1,
      });
    }
  }
  return metaBySubscriptionId;
}

/** Um card por assinatura no mês (combos por mês de produção; mensais sem ciclos prematuros). */
export function filterProductionBoardRowsForMonth(
  rows: AdminCycleRow[],
  monthKey: string,
  metaBySubscriptionId: Map<string, ProductionSubscriptionMeta>
): AdminCycleRow[] {
  const bySubscription = new Map<string, AdminCycleRow[]>();
  for (const row of rows) {
    const list = bySubscription.get(row.subscription_id) ?? [];
    list.push(row);
    bySubscription.set(row.subscription_id, list);
  }

  const inMonth = rows.filter(
    (row) => resolveProductionMonthKey(row) === monthKey
  );

  const eligible: AdminCycleRow[] = [];
  for (const row of inMonth) {
    const meta = metaBySubscriptionId.get(row.subscription_id);
    if (meta && !OPERATIONAL_SUBSCRIPTION_STATUSES.has(meta.status)) {
      continue;
    }

    const siblings = bySubscription.get(row.subscription_id) ?? [];
    if (isPrematureUpcoming(row, siblings)) continue;
    eligible.push(row);
  }

  const eligibleBySubscription = new Map<string, AdminCycleRow[]>();
  for (const row of eligible) {
    const list = eligibleBySubscription.get(row.subscription_id) ?? [];
    list.push(row);
    eligibleBySubscription.set(row.subscription_id, list);
  }

  const deduped: AdminCycleRow[] = [];
  for (const [, subRows] of Array.from(eligibleBySubscription.entries())) {
    const billingTerm = subRows[0]?.subscriptionBillingTerm;
    if (billingTerm && isComboTerm(billingTerm as BillingTerm)) {
      const primary = pickPrimaryOpenCycle(subRows) ?? subRows[0];
      if (primary) deduped.push(primary);
      continue;
    }
    deduped.push(...filterRowsForSubscription(subRows));
  }

  const perUser = keepPrimarySubscriptionPerUser(
    deduped,
    metaBySubscriptionId
  );

  const seen = new Set<string>();
  return perUser.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

export function countDedupedProductionCyclesByMonth(
  rows: AdminCycleRow[],
  metaBySubscriptionId: Map<string, ProductionSubscriptionMeta>
): Map<string, number> {
  const monthKeys = new Set<string>();
  for (const row of rows) {
    const key = resolveProductionMonthKey(row);
    if (key) monthKeys.add(key);
  }

  const counts = new Map<string, number>();
  for (const monthKey of Array.from(monthKeys)) {
    counts.set(
      monthKey,
      filterProductionBoardRowsForMonth(rows, monthKey, metaBySubscriptionId)
        .length
    );
  }
  return counts;
}

export function filterProductionBoardRows(
  rows: AdminCycleRow[],
  metaBySubscriptionId: Map<string, ProductionSubscriptionMeta>
): AdminCycleRow[] {
  const bySubscription = new Map<string, AdminCycleRow[]>();
  for (const row of rows) {
    const list = bySubscription.get(row.subscription_id) ?? [];
    list.push(row);
    bySubscription.set(row.subscription_id, list);
  }

  const eligible: AdminCycleRow[] = [];
  for (const [subscriptionId, subRows] of Array.from(bySubscription.entries())) {
    const meta = metaBySubscriptionId.get(subscriptionId);
    if (meta && !OPERATIONAL_SUBSCRIPTION_STATUSES.has(meta.status)) {
      continue;
    }

    for (const row of subRows) {
      if (isPrematureUpcoming(row, subRows)) continue;
      eligible.push(row);
    }
  }

  const eligibleBySubscription = new Map<string, AdminCycleRow[]>();
  for (const row of eligible) {
    const list = eligibleBySubscription.get(row.subscription_id) ?? [];
    list.push(row);
    eligibleBySubscription.set(row.subscription_id, list);
  }

  const deduped: AdminCycleRow[] = [];
  for (const [, subRows] of Array.from(eligibleBySubscription.entries())) {
    deduped.push(...filterRowsForSubscription(subRows));
  }

  const perUser = keepPrimarySubscriptionPerUser(
    deduped,
    metaBySubscriptionId
  );

  const seen = new Set<string>();
  return perUser.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

export function groupProductionBoardRows(
  rows: AdminCycleRow[]
): Record<
  'upcoming' | 'production' | 'preparing' | 'shipped' | 'delivered',
  AdminCycleRow[]
> {
  const board = {
    upcoming: [] as AdminCycleRow[],
    production: [] as AdminCycleRow[],
    preparing: [] as AdminCycleRow[],
    shipped: [] as AdminCycleRow[],
    delivered: [] as AdminCycleRow[],
  };

  for (const row of rows) {
    if (row.status in board) {
      board[row.status as keyof typeof board].push(row);
    }
  }

  return board;
}
