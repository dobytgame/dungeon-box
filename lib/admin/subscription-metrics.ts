import type { SupabaseClient } from '@supabase/supabase-js';
import { OPERATION_CHART_START } from '@/lib/admin/chart-period';
import {
  parseDailySalesFilters,
  resolveDailySalesBounds,
  type DailySalesFilters,
} from '@/lib/admin/daily-sales';
import {
  isRecurringMrrSubscription,
  recurringMrrCentsForSubscription,
  summarizeRecurringMrr,
} from '@/lib/admin/recurring-mrr';
import {
  brazilDateToEndIso,
  brazilDateToStartIso,
  eachBrazilDay,
  formatBrazilDayLabel,
  todayBrazilDateKey,
  toBrazilDateKey,
} from '@/lib/datetime/brazil';
import {
  buildRevenueCountIndexes,
  loadRevenueCountIndexes,
  resolvePaymentRevenueCents,
  shouldCountInAdminSales,
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
    renewalRevenueCents: number;
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
  const endYear = Number.parseInt(todayBrazilDateKey(now).slice(0, 4), 10);
  const years: number[] = [];
  for (let year = endYear; year >= startYear; year -= 1) {
    years.push(year);
  }
  return years;
}

function dayKey(raw: string | null | undefined): string | null {
  return raw ? toBrazilDateKey(raw) : null;
}

function isActiveOnDay(
  row: SubscriptionSnapshotRow,
  date: string
): boolean {
  const startedAt = row.started_at;
  if (!startedAt || startedAt > brazilDateToEndIso(date)) return false;

  const cancelledAt = row.cancelled_at;
  if (cancelledAt && cancelledAt <= brazilDateToEndIso(date)) return false;

  return true;
}

function buildNewSubscriptionDayCounts(
  payments: RevenuePaymentRow[],
  indexes: ReturnType<typeof buildRevenueCountIndexes>,
  from: string,
  to: string
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const payment of payments) {
    if (!payment.subscription_id) continue;
    if (!shouldCountInAdminSales(payment, indexes)) continue;

    const day = dayKey(payment.paid_at ?? payment.created_at);
    if (!day || day < from || day > to) continue;

    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  return counts;
}

function buildRenewalDayCounts(
  payments: RevenuePaymentRow[],
  from: string,
  to: string
): { counts: Map<string, number>; revenueCents: Map<string, number> } {
  const indexes = buildRevenueCountIndexes(payments);

  const billingPayments = payments
    .filter(
      (row) =>
        row.subscription_id &&
        shouldCountPaymentInRevenue(
          row,
          indexes.canonicalComboBySubscription,
          indexes.comboPrepaidDayBySubscription,
          indexes.canonicalMonthlyBySubscriptionMonth,
          indexes.firstPaymentBySubscription
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
  const counts = new Map<string, number>();
  const revenueCents = new Map<string, number>();

  for (const payment of billingPayments) {
    const subscriptionId = payment.subscription_id!;
    const day = dayKey(payment.paid_at ?? payment.created_at);
    if (!day) continue;

    if (!firstPaymentBySubscription.has(subscriptionId)) {
      firstPaymentBySubscription.add(subscriptionId);
      continue;
    }

    if (day < from || day > to) continue;
    counts.set(day, (counts.get(day) ?? 0) + 1);
    const amountCents = resolvePaymentRevenueCents(payment);
    revenueCents.set(day, (revenueCents.get(day) ?? 0) + amountCents);
  }

  return { counts, revenueCents };
}

export async function getSubscriptionMetricsChartData(
  admin: SupabaseClient,
  searchParams: Record<string, string | undefined> = {}
): Promise<SubscriptionMetricsChartData> {
  const filters = parseDailySalesFilters(searchParams);
  const { from, to, periodLabel } = resolveDailySalesBounds(filters);

  const [subscriptionsRes, paymentsRes, activeCountRes, revenueIndexes] =
    await Promise.all([
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
        prepaid_until,
        started_at
      )
      `
      )
      .eq('status', 'approved')
      .not('subscription_id', 'is', null)
      .gte('paid_at', brazilDateToStartIso(OPERATION_CHART_START))
      .lte('paid_at', brazilDateToEndIso(to)),
    admin
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    loadRevenueCountIndexes(admin, to, { subscriptionOnly: true }),
  ]);

  if (subscriptionsRes.error) {
    console.error('[admin] getSubscriptionMetricsChartData subscriptions:', subscriptionsRes.error.message);
  }
  if (paymentsRes.error) {
    console.error('[admin] getSubscriptionMetricsChartData payments:', paymentsRes.error.message);
  }

  const subscriptions = (subscriptionsRes.data ?? []) as SubscriptionSnapshotRow[];
  const payments = (paymentsRes.data ?? []) as RevenuePaymentRow[];

  const newByDay = buildNewSubscriptionDayCounts(
    payments,
    revenueIndexes,
    from,
    to
  );
  const cancelledByDay = new Map<string, number>();

  for (const row of subscriptions) {
    const cancelledDay = dayKey(row.cancelled_at);
    if (cancelledDay && cancelledDay >= from && cancelledDay <= to) {
      cancelledByDay.set(cancelledDay, (cancelledByDay.get(cancelledDay) ?? 0) + 1);
    }
  }

  const { counts: renewalsByDay, revenueCents: renewalRevenueByDay } =
    buildRenewalDayCounts(payments, from, to);

  const points: SubscriptionMetricsPoint[] = eachBrazilDay(from, to).map((date) => {
    const newCount = newByDay.get(date) ?? 0;
    const cancelledCount = cancelledByDay.get(date) ?? 0;
    const renewalCount = renewalsByDay.get(date) ?? 0;

    const activeRows = subscriptions.filter((row) => isActiveOnDay(row, date));
    const activeCount = activeRows.length;
    const mrrCents = activeRows
      .filter(isRecurringMrrSubscription)
      .reduce((sum, row) => sum + recurringMrrCentsForSubscription(row), 0);

    return {
      date,
      label: formatBrazilDayLabel(date),
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
      renewalRevenueCents:
        acc.renewalRevenueCents + (renewalRevenueByDay.get(point.date) ?? 0),
      netGrowth: acc.netGrowth + point.netGrowth,
    }),
    {
      newCount: 0,
      cancelledCount: 0,
      renewalCount: 0,
      renewalRevenueCents: 0,
      netGrowth: 0,
    }
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

  const todayKey = todayBrazilDateKey();
  const activeToday = subscriptions.filter((row) => isActiveOnDay(row, todayKey));
  const { recurringMrrCents: mrrCents } = summarizeRecurringMrr(activeToday);

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
