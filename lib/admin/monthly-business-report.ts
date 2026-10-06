import type { SupabaseClient } from '@supabase/supabase-js';
import { getOperationChartPeriod } from '@/lib/admin/chart-period';
import { classifyAdminSale } from '@/lib/admin/sales';
import {
  brazilDateToEndIso,
  brazilDateToStartIso,
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

const MONTHLY_REPORT_PAYMENT_SELECT = `
  user_id,
  ${REVENUE_PAYMENT_SELECT}
`;

export interface MonthlyBusinessReportRow {
  monthKey: string;
  monthLabel: string;
  totalRevenueCents: number;
  newSalesCount: number;
  newSalesRevenueCents: number;
  subscriptionNewCount: number;
  subscriptionNewRevenueCents: number;
  storeNewCount: number;
  storeNewRevenueCents: number;
  renewalCount: number;
  renewalRevenueCents: number;
  newCustomersCount: number;
  activeSubscribersEnd: number;
}

export interface MonthlyBusinessReport {
  from: string;
  to: string;
  monthKeys: string[];
  rows: MonthlyBusinessReportRow[];
  totals: Omit<MonthlyBusinessReportRow, 'monthKey' | 'monthLabel'>;
  paymentsAnalyzed: number;
  loadWarning: string | null;
}

type PaymentReportRow = RevenuePaymentRow & {
  user_id: string;
};

type SubscriptionSnapshotRow = {
  started_at: string | null;
  cancelled_at: string | null;
};

function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1));
}

function lastDayOfMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const last = new Date(year, month, 0).getDate();
  return `${monthKey}-${String(last).padStart(2, '0')}`;
}

function paymentMonthKey(row: PaymentReportRow): string | null {
  const raw = row.paid_at ?? row.created_at;
  if (!raw) return null;
  const day = toBrazilDateKey(raw);
  return day ? day.slice(0, 7) : null;
}

async function fetchApprovedPaymentsForMonthlyReport(
  admin: SupabaseClient,
  paidFrom: string,
  paidTo: string
): Promise<{ rows: PaymentReportRow[]; error: string | null }> {
  const pageSize = 1000;
  const orFilter = `and(paid_at.gte."${paidFrom}",paid_at.lte."${paidTo}"),and(paid_at.is.null,created_at.gte."${paidFrom}",created_at.lte."${paidTo}")`;
  const all: PaymentReportRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin
      .from('payments')
      .select(MONTHLY_REPORT_PAYMENT_SELECT)
      .eq('status', 'approved')
      .or(orFilter)
      .order('paid_at', { ascending: true, nullsFirst: false })
      .range(offset, offset + pageSize - 1);

    if (error) {
      return { rows: all, error: error.message };
    }

    const chunk = (data ?? []) as PaymentReportRow[];
    all.push(...chunk);
    if (chunk.length < pageSize) break;
    offset += pageSize;
  }

  return { rows: all, error: null };
}

function isRenewalPayment(
  row: PaymentReportRow,
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

function isActiveOnDay(row: SubscriptionSnapshotRow, dateKey: string): boolean {
  const started = row.started_at;
  if (!started || started > brazilDateToEndIso(dateKey)) return false;
  const cancelled = row.cancelled_at;
  if (cancelled && cancelled <= brazilDateToEndIso(dateKey)) return false;
  return true;
}

function emptyTotals(): MonthlyBusinessReport['totals'] {
  return {
    totalRevenueCents: 0,
    newSalesCount: 0,
    newSalesRevenueCents: 0,
    subscriptionNewCount: 0,
    subscriptionNewRevenueCents: 0,
    storeNewCount: 0,
    storeNewRevenueCents: 0,
    renewalCount: 0,
    renewalRevenueCents: 0,
    newCustomersCount: 0,
    activeSubscribersEnd: 0,
  };
}

export async function buildMonthlyBusinessReport(
  admin: SupabaseClient
): Promise<MonthlyBusinessReport> {
  const { from, to, monthKeys } = getOperationChartPeriod();

  const paidFrom = brazilDateToStartIso(from);
  const paidTo = brazilDateToEndIso(to);

  const [paymentsLoad, subscriptionsRes, indexes] = await Promise.all([
    fetchApprovedPaymentsForMonthlyReport(admin, paidFrom, paidTo),
    admin
      .from('subscriptions')
      .select('started_at, cancelled_at')
      .not('started_at', 'is', null),
    loadRevenueCountIndexes(admin, to),
  ]);

  const loadWarning: string | null = paymentsLoad.error;
  if (paymentsLoad.error) {
    console.error('[admin] monthly report payments:', paymentsLoad.error);
  }

  const payments = paymentsLoad.rows;
  const subscriptions = (subscriptionsRes.data ?? []) as SubscriptionSnapshotRow[];

  const firstPaymentMonthByUser = new Map<string, string>();
  const sortedByPaid = [...payments].sort((a, b) => {
    const aT = a.paid_at ?? a.created_at ?? '';
    const bT = b.paid_at ?? b.created_at ?? '';
    return aT.localeCompare(bT);
  });
  for (const row of sortedByPaid) {
    if (!row.user_id || firstPaymentMonthByUser.has(row.user_id)) continue;
    const month = paymentMonthKey(row);
    if (month) firstPaymentMonthByUser.set(row.user_id, month);
  }

  const rowByMonth = new Map<string, MonthlyBusinessReportRow>();
  for (const monthKey of monthKeys) {
    rowByMonth.set(monthKey, {
      monthKey,
      monthLabel: monthLabel(monthKey),
      ...emptyTotals(),
    });
  }

  for (const payment of payments) {
    const month = paymentMonthKey(payment);
    if (!month || !rowByMonth.has(month)) continue;

    const bucket = rowByMonth.get(month)!;
    const revenueCents = resolvePaymentRevenueCents(payment);
    const countsRevenue = shouldCountPaymentInRevenue(
      payment,
      indexes.canonicalComboBySubscription,
      indexes.comboPrepaidDayBySubscription,
      indexes.canonicalMonthlyBySubscriptionMonth,
      indexes.firstPaymentBySubscription
    );

    if (countsRevenue) {
      bucket.totalRevenueCents += revenueCents;
    }

    const subscription = Array.isArray(payment.subscriptions)
      ? payment.subscriptions[0]
      : payment.subscriptions;
    const plan = subscription?.plans
      ? Array.isArray(subscription.plans)
        ? subscription.plans[0]
        : subscription.plans
      : null;

    const classified = classifyAdminSale({
      subscription_id: payment.subscription_id,
      status_detail: payment.status_detail,
      planName: plan?.name ?? null,
      billingTerm: subscription?.billing_term ?? null,
    });

    const isNewSale = shouldCountInAdminSales(payment, indexes);
    const isRenewal = isRenewalPayment(payment, indexes);

    if (isNewSale) {
      bucket.newSalesCount += 1;
      bucket.newSalesRevenueCents += revenueCents;

      if (
        classified.saleType === 'loja_avulsa' ||
        classified.saleType === 'loja_bundled'
      ) {
        bucket.storeNewCount += 1;
        bucket.storeNewRevenueCents += revenueCents;
      } else if (classified.saleType === 'assinatura') {
        bucket.subscriptionNewCount += 1;
        bucket.subscriptionNewRevenueCents += revenueCents;
      }
    }

    if (isRenewal) {
      bucket.renewalCount += 1;
      bucket.renewalRevenueCents += revenueCents;
    }
  }

  for (const [, month] of Array.from(firstPaymentMonthByUser.entries())) {
    const bucket = rowByMonth.get(month);
    if (bucket) bucket.newCustomersCount += 1;
  }

  for (const monthKey of monthKeys) {
    const endDay =
      monthKey === to.slice(0, 7) ? to : lastDayOfMonthKey(monthKey);
    const active = subscriptions.filter((row) => isActiveOnDay(row, endDay)).length;
    rowByMonth.get(monthKey)!.activeSubscribersEnd = active;
  }

  const rows = monthKeys.map((key) => rowByMonth.get(key)!);
  const totals = rows.reduce((acc, row) => {
    acc.totalRevenueCents += row.totalRevenueCents;
    acc.newSalesCount += row.newSalesCount;
    acc.newSalesRevenueCents += row.newSalesRevenueCents;
    acc.subscriptionNewCount += row.subscriptionNewCount;
    acc.subscriptionNewRevenueCents += row.subscriptionNewRevenueCents;
    acc.storeNewCount += row.storeNewCount;
    acc.storeNewRevenueCents += row.storeNewRevenueCents;
    acc.renewalCount += row.renewalCount;
    acc.renewalRevenueCents += row.renewalRevenueCents;
    acc.newCustomersCount += row.newCustomersCount;
    return acc;
  }, emptyTotals());

  totals.activeSubscribersEnd = rows.length
    ? rows[rows.length - 1]!.activeSubscribersEnd
    : 0;

  return {
    from,
    to,
    monthKeys,
    rows,
    totals,
    paymentsAnalyzed: payments.length,
    loadWarning,
  };
}
