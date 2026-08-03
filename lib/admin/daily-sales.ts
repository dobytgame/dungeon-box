import type { SupabaseClient } from '@supabase/supabase-js';
import { OPERATION_CHART_START } from '@/lib/admin/chart-period';
import { classifyAdminSale } from '@/lib/admin/sales';
import {
  addBrazilDays,
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
  REVENUE_PAYMENT_SELECT,
  shouldCountInAdminSales,
  shouldCountPaymentInRevenue,
  type RevenuePaymentRow,
} from '@/lib/payments/revenue-aggregation';

export type DailySalesPeriod = '7d' | '30d' | '90d' | 'year';

export interface DailySalesFilters {
  year: number;
  month: number | null;
  period: DailySalesPeriod;
}

export interface DailySalesPoint {
  date: string;
  label: string;
  assinaturaCents: number;
  lojaCents: number;
  renewalCents: number;
  totalCents: number;
  totalRevenueCents: number;
}

export interface DailySalesChartData {
  filters: DailySalesFilters;
  from: string;
  to: string;
  periodLabel: string;
  points: DailySalesPoint[];
  totals: {
    assinaturaCents: number;
    lojaCents: number;
    renewalCents: number;
    totalCents: number;
    totalRevenueCents: number;
  };
  availableYears: number[];
}

const PERIOD_LABELS: Record<DailySalesPeriod, string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  year: 'Ano inteiro',
};

const PERIOD_DAYS: Record<Exclude<DailySalesPeriod, 'year'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

function parseFilters(
  searchParams: Record<string, string | undefined>,
  now = new Date()
): DailySalesFilters {
  const todayKey = todayBrazilDateKey(now);
  const currentYear = Number.parseInt(todayKey.slice(0, 4), 10);
  const yearRaw = Number.parseInt(
    searchParams.salesYear ?? searchParams.year ?? String(currentYear),
    10
  );
  const year = Number.isFinite(yearRaw) ? yearRaw : currentYear;

  const monthRaw = (searchParams.salesMonth ?? searchParams.month)?.trim();
  const monthParsed = monthRaw ? Number.parseInt(monthRaw, 10) : NaN;
  const month =
    Number.isFinite(monthParsed) && monthParsed >= 1 && monthParsed <= 12
      ? monthParsed
      : null;

  const periodRaw = (searchParams.salesPeriod ?? searchParams.period) as
    | DailySalesPeriod
    | undefined;
  const period: DailySalesPeriod =
    periodRaw && periodRaw in PERIOD_LABELS ? periodRaw : '30d';

  return { year, month, period };
}

function listYears(now = new Date()): number[] {
  const [startYear] = OPERATION_CHART_START.split('-').map(Number);
  const endYear = Number.parseInt(todayBrazilDateKey(now).slice(0, 4), 10);
  const years: number[] = [];
  for (let year = endYear; year >= startYear; year -= 1) {
    years.push(year);
  }
  return years;
}

function resolveBounds(
  filters: DailySalesFilters,
  now = new Date()
): { from: string; to: string; periodLabel: string } {
  const todayKey = todayBrazilDateKey(now);
  const todayYear = Number.parseInt(todayKey.slice(0, 4), 10);

  if (filters.month) {
    const month = String(filters.month).padStart(2, '0');
    const lastDay = new Date(filters.year, filters.month, 0).getDate();
    const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(
      new Date(filters.year, filters.month - 1, 1)
    );
    const monthEnd =
      filters.year === todayYear && filters.month === Number.parseInt(todayKey.slice(5, 7), 10)
        ? todayKey
        : `${filters.year}-${month}-${String(lastDay).padStart(2, '0')}`;
    return {
      from: `${filters.year}-${month}-01`,
      to: monthEnd,
      periodLabel: `${monthName} ${filters.year}`,
    };
  }

  const isCurrentYear = filters.year === todayYear;

  if (filters.period === 'year') {
    return {
      from: `${filters.year}-01-01`,
      to: isCurrentYear ? todayKey : `${filters.year}-12-31`,
      periodLabel: `Ano ${filters.year}`,
    };
  }

  const days = PERIOD_DAYS[filters.period];
  if (isCurrentYear) {
    const from = addBrazilDays(todayKey, -(days - 1));
    const opStart = OPERATION_CHART_START;
    return {
      from: from < opStart ? opStart : from,
      to: todayKey,
      periodLabel: PERIOD_LABELS[filters.period],
    };
  }

  const yearEnd = `${filters.year}-12-31`;
  const from = addBrazilDays(yearEnd, -(days - 1));
  const yearStart = `${filters.year}-01-01`;

  return {
    from: from < yearStart ? yearStart : from,
    to: yearEnd,
    periodLabel: `${PERIOD_LABELS[filters.period]} · ${filters.year}`,
  };
}

function chartDayKey(paidAt: string | null, createdAt: string | null): string | null {
  const raw = paidAt ?? createdAt;
  if (!raw) return null;
  return toBrazilDateKey(raw);
}

export function parseDailySalesFilters(
  searchParams: Record<string, string | undefined>
): DailySalesFilters {
  return parseFilters(searchParams);
}

export function resolveDailySalesBounds(
  filters: DailySalesFilters,
  now = new Date()
): { from: string; to: string; periodLabel: string } {
  return resolveBounds(filters, now);
}

function isRenewalPayment(
  row: RevenuePaymentRow,
  indexes: ReturnType<typeof buildRevenueCountIndexes>
): boolean {
  if (!row.subscription_id) return false;

  return (
    shouldCountPaymentInRevenue(
      row,
      indexes.canonicalComboBySubscription,
      indexes.comboPrepaidDayBySubscription,
      indexes.canonicalMonthlyBySubscriptionMonth,
      indexes.firstPaymentBySubscription
    ) && !shouldCountInAdminSales(row, indexes)
  );
}

export async function getDailySalesChartData(
  admin: SupabaseClient,
  searchParams: Record<string, string | undefined> = {}
): Promise<DailySalesChartData> {
  const filters = parseFilters(searchParams);
  const { from, to, periodLabel } = resolveBounds(filters);

  const paidFrom = brazilDateToStartIso(from);
  const paidTo = brazilDateToEndIso(to);

  const [periodRes, indexes] = await Promise.all([
    admin
      .from('payments')
      .select(REVENUE_PAYMENT_SELECT)
      .eq('status', 'approved')
      .or(
        `and(paid_at.gte."${paidFrom}",paid_at.lte."${paidTo}"),and(paid_at.is.null,created_at.gte."${paidFrom}",created_at.lte."${paidTo}")`
      ),
    loadRevenueCountIndexes(admin, to),
  ]);

  if (periodRes.error) {
    console.error('[admin] getDailySalesChartData:', periodRes.error.message);
  }

  const rows = (periodRes.data ?? []) as RevenuePaymentRow[];

  const byDay = new Map<
    string,
    { assinaturaCents: number; lojaCents: number; renewalCents: number }
  >();

  for (const row of rows) {
    const day = chartDayKey(
      row.paid_at as string | null,
      row.created_at as string | null
    );
    if (!day || day < from || day > to) continue;

    const amountCents = resolvePaymentRevenueCents(row);
    const bucket = byDay.get(day) ?? {
      assinaturaCents: 0,
      lojaCents: 0,
      renewalCents: 0,
    };

    if (isRenewalPayment(row, indexes)) {
      bucket.renewalCents += amountCents;
      byDay.set(day, bucket);
      continue;
    }

    if (!shouldCountInAdminSales(row, indexes)) {
      continue;
    }

    const subscription = Array.isArray(row.subscriptions)
      ? row.subscriptions[0]
      : row.subscriptions;
    const plan = subscription?.plans
      ? Array.isArray(subscription.plans)
        ? subscription.plans[0]
        : subscription.plans
      : null;

    const { saleType } = classifyAdminSale({
      subscription_id: row.subscription_id as string | null,
      status_detail: row.status_detail as string | null,
      planName: (plan?.name as string | null) ?? null,
      billingTerm: (subscription as { billing_term?: string | null } | null)
        ?.billing_term,
    });

    if (saleType === 'assinatura') {
      bucket.assinaturaCents += amountCents;
    } else {
      bucket.lojaCents += amountCents;
    }
    byDay.set(day, bucket);
  }

  const points: DailySalesPoint[] = eachBrazilDay(from, to).map((date) => {
    const bucket = byDay.get(date) ?? {
      assinaturaCents: 0,
      lojaCents: 0,
      renewalCents: 0,
    };
    const totalCents = bucket.assinaturaCents + bucket.lojaCents;
    return {
      date,
      label: formatBrazilDayLabel(date),
      assinaturaCents: bucket.assinaturaCents,
      lojaCents: bucket.lojaCents,
      renewalCents: bucket.renewalCents,
      totalCents,
      totalRevenueCents: totalCents + bucket.renewalCents,
    };
  });

  const totals = points.reduce(
    (acc, point) => ({
      assinaturaCents: acc.assinaturaCents + point.assinaturaCents,
      lojaCents: acc.lojaCents + point.lojaCents,
      renewalCents: acc.renewalCents + point.renewalCents,
      totalCents: acc.totalCents + point.totalCents,
      totalRevenueCents: acc.totalRevenueCents + point.totalRevenueCents,
    }),
    {
      assinaturaCents: 0,
      lojaCents: 0,
      renewalCents: 0,
      totalCents: 0,
      totalRevenueCents: 0,
    }
  );

  return {
    filters,
    from,
    to,
    periodLabel,
    points,
    totals,
    availableYears: listYears(),
  };
}
