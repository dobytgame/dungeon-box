import type { SupabaseClient } from '@supabase/supabase-js';
import { OPERATION_CHART_START } from '@/lib/admin/chart-period';
import { classifyAdminSale } from '@/lib/admin/sales';
import {
  buildRevenueCountIndexes,
  resolvePaymentRevenueCents,
  shouldCountInAdminSales,
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
  totalCents: number;
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
    totalCents: number;
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
  const currentYear = now.getFullYear();
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
  const endYear = now.getFullYear();
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
  if (filters.month) {
    const month = String(filters.month).padStart(2, '0');
    const lastDay = new Date(filters.year, filters.month, 0).getDate();
    const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(
      new Date(filters.year, filters.month - 1, 1)
    );
    return {
      from: `${filters.year}-${month}-01`,
      to: `${filters.year}-${month}-${String(lastDay).padStart(2, '0')}`,
      periodLabel: `${monthName} ${filters.year}`,
    };
  }

  const isCurrentYear = filters.year === now.getFullYear();

  if (filters.period === 'year') {
    return {
      from: `${filters.year}-01-01`,
      to: isCurrentYear ? now.toISOString().slice(0, 10) : `${filters.year}-12-31`,
      periodLabel: `Ano ${filters.year}`,
    };
  }

  const days = PERIOD_DAYS[filters.period];
  if (isCurrentYear) {
    const start = new Date(now);
    start.setDate(start.getDate() - (days - 1));
    const from = start.toISOString().slice(0, 10);
    const opStart = OPERATION_CHART_START;
    return {
      from: from < opStart ? opStart : from,
      to: now.toISOString().slice(0, 10),
      periodLabel: PERIOD_LABELS[filters.period],
    };
  }

  const end = new Date(filters.year, 11, 31);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  const from = start.toISOString().slice(0, 10);
  const yearStart = `${filters.year}-01-01`;

  return {
    from: from < yearStart ? yearStart : from,
    to: `${filters.year}-12-31`,
    periodLabel: `${PERIOD_LABELS[filters.period]} · ${filters.year}`,
  };
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

function chartDayKey(paidAt: string | null, createdAt: string | null): string | null {
  const raw = paidAt ?? createdAt;
  if (!raw) return null;
  return raw.slice(0, 10);
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

export async function getDailySalesChartData(
  admin: SupabaseClient,
  searchParams: Record<string, string | undefined> = {}
): Promise<DailySalesChartData> {
  const filters = parseFilters(searchParams);
  const { from, to, periodLabel } = resolveBounds(filters);

  const { data, error } = await admin
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
        started_at,
        plans!plan_id(name)
      )
    `
    )
    .eq('status', 'approved')
    .gte('paid_at', `${from}T00:00:00`)
    .lte('paid_at', `${to}T23:59:59.999`);

  if (error) {
    console.error('[admin] getDailySalesChartData:', error.message);
  }

  const rows = (data ?? []) as RevenuePaymentRow[];
  const indexes = buildRevenueCountIndexes(rows);

  const byDay = new Map<string, { assinaturaCents: number; lojaCents: number }>();

  for (const row of rows) {
    if (!shouldCountInAdminSales(row, indexes)) {
      continue;
    }

    const day = chartDayKey(
      row.paid_at as string | null,
      row.created_at as string | null
    );
    if (!day || day < from || day > to) continue;

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

    const amountCents = resolvePaymentRevenueCents(row);

    const bucket = byDay.get(day) ?? { assinaturaCents: 0, lojaCents: 0 };
    if (saleType === 'assinatura') {
      bucket.assinaturaCents += amountCents;
    } else {
      bucket.lojaCents += amountCents;
    }
    byDay.set(day, bucket);
  }

  const points: DailySalesPoint[] = eachDay(from, to).map((date) => {
    const bucket = byDay.get(date) ?? { assinaturaCents: 0, lojaCents: 0 };
    return {
      date,
      label: dayLabel(date),
      assinaturaCents: bucket.assinaturaCents,
      lojaCents: bucket.lojaCents,
      totalCents: bucket.assinaturaCents + bucket.lojaCents,
    };
  });

  const totals = points.reduce(
    (acc, point) => ({
      assinaturaCents: acc.assinaturaCents + point.assinaturaCents,
      lojaCents: acc.lojaCents + point.lojaCents,
      totalCents: acc.totalCents + point.totalCents,
    }),
    { assinaturaCents: 0, lojaCents: 0, totalCents: 0 }
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
