import type { SupabaseClient } from '@supabase/supabase-js';
import { OPERATION_CHART_START } from '@/lib/admin/chart-period';
import {
  parseDailySalesFilters,
  resolveDailySalesBounds,
  type DailySalesFilters,
} from '@/lib/admin/daily-sales';
import { resolveSubscriptionMonthlyRevenueCents } from '@/lib/admin/subscription-monthly-revenue';
import { isComboTerm, type BillingTerm } from '@/lib/checkout/combo-billing';
import {
  buildCanonicalComboPrepaidIndex,
  buildComboPrepaidDayBySubscription,
  isComboSubscription,
  shouldCountPaymentInRevenue,
  type RevenuePaymentRow,
} from '@/lib/payments/revenue-aggregation';

export interface SubscriptionMetricsPoint {
  date: string;
  label: string;
  newCount: number;
  cancelledCount: number;
  renewalCount: number;
  netGrowth: number;
  mrrCents: number;
  activeCount: number;
}

export interface SubscriptionMetricsChartData {
  filters: DailySalesFilters;
  from: string;
  to: string;
  periodLabel: string;
  points: SubscriptionMetricsPoint[];
  totals: {
    newCount: number;
    cancelledCount: number;
    renewalCount: number;
    netGrowth: number;
  };
  summary: {
    churnRatePercent: number | null;
    retentionRatePercent: number | null;
    activeSubscribers: number;
    mrrCents: number;
    activeAtPeriodStart: number;
  };
  availableYears: number[];
}

type SubscriptionSnapshotRow = {
  started_at: string | null;
  cancelled_at: string | null;
  shipping_cents: number | null;
  special_notes: string | null;
  billing_term?: string | null;
  combo_total_cents?: number | null;
  prepaid_months?: number | null;
  prepaid_until?: string | null;
  plans: { price_cents: number | null } | { price_cents: number | null }[] | null;
};

function listYears(now = new Date()): number[] {
  const [startYear] = OPERATION_CHART_START.split('-').map(Number);
  const endYear = now.getFullYear();
  const years: number[] = [];
  for (let year = endYear; year >= startYear; year -= 1) {
    years.push(year);
  }
  return years;
}

function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);

  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function dayLabel(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
  }).format(parsed);
}

function dayKey(raw: string | null | undefined): string | null {
  return raw ? raw.slice(0, 10) : null;
}

function endOfDayIso(date: string): string {
  return `${date}T23:59:59.999Z`;
}

function isRecurringMrrSubscription(row: SubscriptionSnapshotRow): boolean {
  if (isComboSubscription(row)) {
    return false;
  }

  if (row.billing_term && isComboTerm(row.billing_term as BillingTerm)) {
    return false;
  }

  if (row.prepaid_until) {
    const prepaidUntil = new Date(row.prepaid_until);
    if (!Number.isNaN(prepaidUntil.getTime()) && prepaidUntil > new Date()) {
      return false;
    }
  }

  return true;
}

function resolvePlanPriceCents(row: SubscriptionSnapshotRow): number {
  const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
  return resolveSubscriptionMonthlyRevenueCents({
    planPriceCents: plan?.price_cents ?? null,
    shippingCents: row.shipping_cents,
    specialNotes: row.special_notes,
  }) ?? 0;
}

function isActiveOnDay(
  row: SubscriptionSnapshotRow,
  date: string
): boolean {
  const startedAt = row.started_at;
  if (!startedAt || startedAt > endOfDayIso(date)) return false;

  const cancelledAt = row.cancelled_at;
  if (cancelledAt && cancelledAt <= endOfDayIso(date)) return false;

  return true;
}

function buildRenewalDayCounts(
  payments: RevenuePaymentRow[],
  from: string,
  to: string
): Map<string, number> {
  const canonicalComboBySubscription = buildCanonicalComboPrepaidIndex(payments);
  const comboPrepaidDayBySubscription = buildComboPrepaidDayBySubscription(
    payments,
    canonicalComboBySubscription
  );

  const billingPayments = payments
    .filter(
      (row) =>
        row.subscription_id &&
        shouldCountPaymentInRevenue(
          row,
          canonicalComboBySubscription,
          comboPrepaidDayBySubscription
        )
    )
    .sort((a, b) => {
      const aTime = a.paid_at ?? a.created_at ?? '';
      const bTime = b.paid_at ?? b.created_at ?? '';
      const cmp = aTime.localeCompare(bTime);
      if (cmp !== 0) return cmp;
      return a.id.localeCompare(b.id);
    });

  const firstPaymentBySubscription = new Set<string>();
  const renewalsByDay = new Map<string, number>();

  for (const payment of billingPayments) {
    const subscriptionId = payment.subscription_id!;
    const day = dayKey(payment.paid_at ?? payment.created_at);
    if (!day) continue;

    if (!firstPaymentBySubscription.has(subscriptionId)) {
      firstPaymentBySubscription.add(subscriptionId);
      continue;
    }

    if (day < from || day > to) continue;
    renewalsByDay.set(day, (renewalsByDay.get(day) ?? 0) + 1);
  }

  return renewalsByDay;
}

export async function getSubscriptionMetricsChartData(
  admin: SupabaseClient,
  searchParams: Record<string, string | undefined> = {}
): Promise<SubscriptionMetricsChartData> {
  const filters = parseDailySalesFilters(searchParams);
  const { from, to, periodLabel } = resolveDailySalesBounds(filters);

  const [subscriptionsRes, paymentsRes, activeCountRes, mrrRes] = await Promise.all([
    admin
      .from('subscriptions')
      .select(
        `
        started_at,
        cancelled_at,
        shipping_cents,
        special_notes,
        billing_term,
        combo_total_cents,
        prepaid_months,
        prepaid_until,
        plans!plan_id(price_cents)
      `
      )
      .not('started_at', 'is', null),
    admin
      .from('payments')
      .select(
        `
        id,
        amount_cents,
        status_detail,
        installments,
        subscription_id,
        paid_at,
        created_at,
        subscriptions(
          billing_term,
          combo_total_cents,
          combo_installments,
          prepaid_months,
          prepaid_until
        )
      `
      )
      .eq('status', 'approved')
      .not('subscription_id', 'is', null)
      .gte('paid_at', `${OPERATION_CHART_START}T00:00:00`)
      .lte('paid_at', `${to}T23:59:59.999`),
    admin
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    admin.from('mrr').select('*'),
  ]);

  if (subscriptionsRes.error) {
    console.error('[admin] getSubscriptionMetricsChartData subscriptions:', subscriptionsRes.error.message);
  }
  if (paymentsRes.error) {
    console.error('[admin] getSubscriptionMetricsChartData payments:', paymentsRes.error.message);
  }

  const subscriptions = (subscriptionsRes.data ?? []) as SubscriptionSnapshotRow[];
  const payments = (paymentsRes.data ?? []) as RevenuePaymentRow[];

  const newByDay = new Map<string, number>();
  const cancelledByDay = new Map<string, number>();

  for (const row of subscriptions) {
    const startedDay = dayKey(row.started_at);
    if (startedDay && startedDay >= from && startedDay <= to) {
      newByDay.set(startedDay, (newByDay.get(startedDay) ?? 0) + 1);
    }

    const cancelledDay = dayKey(row.cancelled_at);
    if (cancelledDay && cancelledDay >= from && cancelledDay <= to) {
      cancelledByDay.set(cancelledDay, (cancelledByDay.get(cancelledDay) ?? 0) + 1);
    }
  }

  const renewalsByDay = buildRenewalDayCounts(payments, from, to);

  const points: SubscriptionMetricsPoint[] = eachDay(from, to).map((date) => {
    const newCount = newByDay.get(date) ?? 0;
    const cancelledCount = cancelledByDay.get(date) ?? 0;
    const renewalCount = renewalsByDay.get(date) ?? 0;

    const activeRows = subscriptions.filter((row) => isActiveOnDay(row, date));
    const activeCount = activeRows.length;
    const mrrCents = activeRows
      .filter(isRecurringMrrSubscription)
      .reduce((sum, row) => sum + resolvePlanPriceCents(row), 0);

    return {
      date,
      label: dayLabel(date),
      newCount,
      cancelledCount,
      renewalCount,
      netGrowth: newCount - cancelledCount,
      mrrCents,
      activeCount,
    };
  });

  const totals = points.reduce(
    (acc, point) => ({
      newCount: acc.newCount + point.newCount,
      cancelledCount: acc.cancelledCount + point.cancelledCount,
      renewalCount: acc.renewalCount + point.renewalCount,
      netGrowth: acc.netGrowth + point.netGrowth,
    }),
    { newCount: 0, cancelledCount: 0, renewalCount: 0, netGrowth: 0 }
  );

  const activeAtPeriodStart = subscriptions.filter((row) =>
    isActiveOnDay(row, from)
  ).length;

  const churnRatePercent =
    activeAtPeriodStart > 0
      ? Math.round((totals.cancelledCount / activeAtPeriodStart) * 1000) / 10
      : null;

  const renewalDenominator = totals.renewalCount + totals.cancelledCount;
  const retentionRatePercent =
    renewalDenominator > 0
      ? Math.round((totals.renewalCount / renewalDenominator) * 1000) / 10
      : null;

  const mrrRows = mrrRes.data ?? [];
  const mrrCents = mrrRows.reduce(
    (sum, row) => sum + Math.round(Number(row.mrr_brl ?? 0) * 100),
    0
  );

  return {
    filters,
    from,
    to,
    periodLabel,
    points,
    totals,
    summary: {
      churnRatePercent,
      retentionRatePercent,
      activeSubscribers: activeCountRes.count ?? 0,
      mrrCents,
      activeAtPeriodStart,
    },
    availableYears: listYears(),
  };
}
