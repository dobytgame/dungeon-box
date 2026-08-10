import type { SupabaseClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { parseStoreOrderMeta } from '@/lib/asaas/store-order-payment';
import { getOperationChartPeriod } from '@/lib/admin/chart-period';
import {
  addBrazilDays,
  brazilDateToEndIso,
  brazilDateToStartIso,
  todayBrazilDateKey,
} from '@/lib/datetime/brazil';
import { getProfitByMonth, getProfitSummary } from '@/lib/admin/profit-analytics';
import {
  buildRevenueCountIndexes,
  resolvePaymentRevenueCents,
  shouldCountPaymentInRevenue,
  type RevenuePaymentRow,
} from '@/lib/payments/revenue-aggregation';
import { createAdminClient } from '@/lib/supabase/admin';
import { ADMIN_FINANCE_CACHE_TAG } from '@/lib/admin/cache-tags';
import type {
  AdminFinancialCategoryRow,
  AdminFinancialDashboard,
  AdminFinancialExpenseRow,
  AdminFinancialMovementRow,
  AdminFinancialPeriod,
  AdminFinancialSummary,
} from '@/lib/admin/types';

export { ADMIN_FINANCE_CACHE_TAG } from '@/lib/admin/cache-tags';

const ADMIN_FINANCE_REVALIDATE_SECONDS = 120;

const PERIOD_DAYS: Record<Exclude<AdminFinancialPeriod, 'year' | 'all'>, number> = {
  '30d': 30,
  '90d': 90,
};

export function getFinancialPeriodBounds(period: AdminFinancialPeriod): {
  from: string;
  to: string;
} {
  const to = todayBrazilDateKey();

  if (period === 'all') {
    return { from: '2020-01-01', to };
  }

  if (period === 'year') {
    const year = to.slice(0, 4);
    return { from: `${year}-01-01`, to };
  }

  const days = PERIOD_DAYS[period];
  const from = addBrazilDays(to, -days);
  return { from, to };
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(date);
}

function describePayment(row: {
  subscription_id: string | null;
  status_detail: string | null;
  planName: string | null;
}): string {
  const storeMeta = parseStoreOrderMeta(row.status_detail);
  if (storeMeta?.items.length) {
    return storeMeta.items
      .map((line) => (line.quantity > 1 ? `${line.name} ×${line.quantity}` : line.name))
      .join(', ');
  }
  if (row.subscription_id) {
    return row.planName ? `Assinatura — ${row.planName}` : 'Assinatura';
  }
  return 'Pagamento';
}

export async function listFinancialCategories(
  admin: SupabaseClient
): Promise<AdminFinancialCategoryRow[]> {
  const { data, error } = await admin
    .from('financial_expense_categories')
    .select('id, name, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('[admin] listFinancialCategories:', error.message);
    return [];
  }

  return (data ?? []) as AdminFinancialCategoryRow[];
}

export async function listFinancialExpenses(
  admin: SupabaseClient,
  filters: {
    status?: string;
    categoryId?: string;
    from?: string;
    to?: string;
    limit?: number;
  } = {}
): Promise<AdminFinancialExpenseRow[]> {
  const limit = filters.limit ?? 200;
  let query = admin
    .from('financial_expenses')
    .select(
      `
      id,
      category_id,
      description,
      amount_cents,
      expense_date,
      paid_at,
      status,
      vendor,
      notes,
      payment_id,
      cycle_id,
      created_at,
      financial_expense_categories(name)
    `
    )
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.from) query = query.gte('expense_date', filters.from);
  if (filters.to) query = query.lte('expense_date', filters.to);

  const { data, error } = await query;
  if (error) {
    console.error('[admin] listFinancialExpenses:', error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const category = Array.isArray(row.financial_expense_categories)
      ? row.financial_expense_categories[0]
      : row.financial_expense_categories;

    return {
      id: row.id as string,
      categoryId: row.category_id as string,
      categoryName: (category?.name as string) ?? row.category_id,
      description: row.description as string,
      amount_cents: row.amount_cents as number,
      expense_date: row.expense_date as string,
      paid_at: (row.paid_at as string | null) ?? null,
      status: row.status as AdminFinancialExpenseRow['status'],
      vendor: (row.vendor as string | null) ?? null,
      notes: (row.notes as string | null) ?? null,
      payment_id: (row.payment_id as string | null) ?? null,
      cycle_id: (row.cycle_id as string | null) ?? null,
      created_at: (row.created_at as string | null) ?? null,
    };
  });
}

type ApprovedPaymentRevenueRow = RevenuePaymentRow;

/** Campos necessários para regras de receita — sem profiles (menor egress). */
const PAYMENT_REVENUE_AGG_SELECT = `
  id,
  amount_cents,
  status,
  paid_at,
  created_at,
  subscription_id,
  status_detail,
  installments,
  subscriptions(
    billing_term,
    combo_total_cents,
    combo_installments,
    prepaid_months,
    prepaid_until,
    started_at,
    plans!plan_id(name)
  )
`;

const PAYMENT_MOVEMENT_SELECT = `
  id,
  amount_cents,
  status,
  paid_at,
  created_at,
  subscription_id,
  status_detail,
  installments,
  profiles(full_name, display_name, email),
  subscriptions(
    billing_term,
    combo_total_cents,
    combo_installments,
    prepaid_months,
    prepaid_until,
    started_at,
    plans!plan_id(name)
  )
`;

export function sumApprovedPaymentsRevenueCents(
  payments: ApprovedPaymentRevenueRow[]
): number {
  const rows = payments as RevenuePaymentRow[];
  const indexes = buildRevenueCountIndexes(rows);

  return rows.reduce((sum, row) => {
    if (
      !shouldCountPaymentInRevenue(
        row,
        indexes.canonicalComboBySubscription,
        indexes.comboPrepaidDayBySubscription,
        indexes.canonicalMonthlyBySubscriptionMonth,
        indexes.firstPaymentBySubscription
      )
    ) {
      return sum;
    }
    return sum + resolvePaymentRevenueCents(row);
  }, 0);
}

export async function getTotalApprovedRevenue(
  _admin?: SupabaseClient
): Promise<{ revenueCents: number; paymentCount: number }> {
  return unstable_cache(
    async () => {
      const admin = createAdminClient();
      const { from, to } = getFinancialPeriodBounds('all');
      const payments = await fetchApprovedPaymentsForAggregation(admin, from, to);
      return {
        revenueCents: sumApprovedPaymentsRevenueCents(payments),
        paymentCount: payments.length,
      };
    },
    ['admin-total-approved-revenue'],
    {
      revalidate: ADMIN_FINANCE_REVALIDATE_SECONDS,
      tags: [ADMIN_FINANCE_CACHE_TAG],
    }
  )();
}

async function fetchApprovedPaymentsForAggregation(
  admin: SupabaseClient,
  from: string,
  to: string
): Promise<ApprovedPaymentRevenueRow[]> {
  const { data, error } = await admin
    .from('payments')
    .select(PAYMENT_REVENUE_AGG_SELECT)
    .eq('status', 'approved')
    .gte('paid_at', brazilDateToStartIso(from))
    .lte('paid_at', brazilDateToEndIso(to))
    .order('paid_at', { ascending: false });

  if (error) {
    console.error('[admin] fetchApprovedPaymentsForAggregation:', error.message);
    return [];
  }

  return (data ?? []) as ApprovedPaymentRevenueRow[];
}

async function fetchApprovedPaymentsForMovements(
  admin: SupabaseClient,
  from: string,
  to: string
) {
  const { data, error } = await admin
    .from('payments')
    .select(PAYMENT_MOVEMENT_SELECT)
    .eq('status', 'approved')
    .gte('paid_at', brazilDateToStartIso(from))
    .lte('paid_at', brazilDateToEndIso(to))
    .order('paid_at', { ascending: false });

  if (error) {
    console.error('[admin] fetchApprovedPaymentsForMovements:', error.message);
    return [];
  }

  return data ?? [];
}

async function fetchRefundedPayments(
  admin: SupabaseClient,
  from: string,
  to: string
) {
  const { data, error } = await admin
    .from('payments')
    .select('id, amount_cents, paid_at, updated_at, status')
    .in('status', ['refunded', 'charged_back'])
    .gte('updated_at', `${from}T00:00:00`)
    .lte('updated_at', `${to}T23:59:59`);

  if (error) {
    console.error('[admin] fetchRefundedPayments:', error.message);
    return [];
  }

  return data ?? [];
}

/** Linhas leves para totais/cashflow — sem notes/vendor. */
async function fetchExpenseAggRows(
  admin: SupabaseClient,
  filters: {
    from: string;
    to: string;
    status?: string;
  }
): Promise<
  Array<{
    amount_cents: number;
    expense_date: string;
    paid_at: string | null;
    status: string;
    category_id: string;
    category_name: string;
  }>
> {
  let query = admin
    .from('financial_expenses')
    .select(
      `
      amount_cents,
      expense_date,
      paid_at,
      status,
      category_id,
      financial_expense_categories(name)
    `
    )
    .gte('expense_date', filters.from)
    .lte('expense_date', filters.to)
    .order('expense_date', { ascending: false })
    .limit(5000);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[admin] fetchExpenseAggRows:', error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const category = Array.isArray(row.financial_expense_categories)
      ? row.financial_expense_categories[0]
      : row.financial_expense_categories;
    return {
      amount_cents: row.amount_cents as number,
      expense_date: row.expense_date as string,
      paid_at: (row.paid_at as string | null) ?? null,
      status: row.status as string,
      category_id: row.category_id as string,
      category_name: (category?.name as string | null) ?? 'Sem categoria',
    };
  });
}

export async function getFinancialSummary(
  admin: SupabaseClient,
  period: AdminFinancialPeriod = '30d'
): Promise<AdminFinancialSummary> {
  const { from, to } = getFinancialPeriodBounds(period);

  const [payments, refunds, expenses] = await Promise.all([
    fetchApprovedPaymentsForAggregation(admin, from, to),
    fetchRefundedPayments(admin, from, to),
    fetchExpenseAggRows(admin, { from, to }),
  ]);

  const revenueCents = sumApprovedPaymentsRevenueCents(payments);
  const refundCents = refunds.reduce(
    (sum, row) => sum + (row.amount_cents as number),
    0
  );

  const paidExpenses = expenses.filter((e) => e.status === 'paid');
  const pendingExpenses = expenses.filter((e) => e.status === 'pending');

  const expenseCents = paidExpenses.reduce((sum, e) => sum + e.amount_cents, 0);
  const pendingExpenseCents = pendingExpenses.reduce(
    (sum, e) => sum + e.amount_cents,
    0
  );

  const netCents = revenueCents - refundCents - expenseCents;

  const expensesByCategory: Record<string, { name: string; cents: number; count: number }> = {};
  for (const expense of paidExpenses) {
    if (!expensesByCategory[expense.category_id]) {
      expensesByCategory[expense.category_id] = {
        name: expense.category_name,
        cents: 0,
        count: 0,
      };
    }
    expensesByCategory[expense.category_id].cents += expense.amount_cents;
    expensesByCategory[expense.category_id].count += 1;
  }

  return {
    period,
    from,
    to,
    revenueCents,
    revenueCount: payments.length,
    refundCents,
    refundCount: refunds.length,
    expenseCents,
    expenseCount: paidExpenses.length,
    pendingExpenseCents,
    pendingExpenseCount: pendingExpenses.length,
    netCents,
    expensesByCategory: Object.entries(expensesByCategory)
      .map(([id, row]) => ({ id, ...row }))
      .sort((a, b) => b.cents - a.cents),
  };
}

export async function getCashFlowByMonth(
  admin: SupabaseClient
): Promise<{ month: string; label: string; inflowCents: number; outflowCents: number; netCents: number }[]> {
  const { from, to, monthKeys } = getOperationChartPeriod();

  const [payments, refunds, expenses] = await Promise.all([
    fetchApprovedPaymentsForAggregation(admin, from, to),
    fetchRefundedPayments(admin, from, to),
    fetchExpenseAggRows(admin, { from, to, status: 'paid' }),
  ]);

  const buckets = new Map<string, { inflow: number; outflow: number }>();

  for (const key of monthKeys) {
    buckets.set(key, { inflow: 0, outflow: 0 });
  }

  const paymentRows = payments as RevenuePaymentRow[];
  const indexes = buildRevenueCountIndexes(paymentRows);

  for (const payment of paymentRows) {
    if (
      !shouldCountPaymentInRevenue(
        payment,
        indexes.canonicalComboBySubscription,
        indexes.comboPrepaidDayBySubscription,
        indexes.canonicalMonthlyBySubscriptionMonth,
        indexes.firstPaymentBySubscription
      )
    ) {
      continue;
    }

    const key = monthKey((payment.paid_at as string) ?? (payment.created_at as string));
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.inflow += resolvePaymentRevenueCents(payment);
  }

  for (const refund of refunds) {
    const key = monthKey((refund.updated_at as string) ?? (refund.paid_at as string) ?? '');
    const bucket = buckets.get(key);
    if (bucket) bucket.outflow += refund.amount_cents as number;
  }

  for (const expense of expenses) {
    const date = expense.paid_at ?? expense.expense_date;
    const key = monthKey(date);
    const bucket = buckets.get(key);
    if (bucket) bucket.outflow += expense.amount_cents;
  }

  return monthKeys.map((month) => {
    const row = buckets.get(month) ?? { inflow: 0, outflow: 0 };
    return {
      month,
      label: monthLabel(month),
      inflowCents: row.inflow,
      outflowCents: row.outflow,
      netCents: row.inflow - row.outflow,
    };
  });
}

export async function listFinancialMovements(
  admin: SupabaseClient,
  filters: { from?: string; to?: string; limit?: number } = {}
): Promise<AdminFinancialMovementRow[]> {
  const limit = filters.limit ?? 100;
  const from = filters.from ?? '2020-01-01';
  const to = filters.to ?? new Date().toISOString().slice(0, 10);

  const [payments, refunds, expenses] = await Promise.all([
    fetchApprovedPaymentsForMovements(admin, from, to),
    fetchRefundedPayments(admin, from, to),
    listFinancialExpenses(admin, { from, to, limit: 500 }),
  ]);

  const movements: AdminFinancialMovementRow[] = [];

  const paymentRows = payments as RevenuePaymentRow[];
  const indexes = buildRevenueCountIndexes(paymentRows);

  for (const row of paymentRows) {
    const paymentRow = row as RevenuePaymentRow & {
      profiles?: unknown;
    };
    if (
      !shouldCountPaymentInRevenue(
        paymentRow,
        indexes.canonicalComboBySubscription,
        indexes.comboPrepaidDayBySubscription,
        indexes.canonicalMonthlyBySubscriptionMonth,
        indexes.firstPaymentBySubscription
      )
    ) {
      continue;
    }

    const profile = Array.isArray(paymentRow.profiles)
      ? paymentRow.profiles[0]
      : paymentRow.profiles;
    const subscription = Array.isArray(row.subscriptions)
      ? row.subscriptions[0]
      : row.subscriptions;
    const plan = subscription?.plans
      ? Array.isArray(subscription.plans)
        ? subscription.plans[0]
        : subscription.plans
      : null;

    movements.push({
      id: row.id as string,
      kind: 'income',
      label: describePayment({
        subscription_id: row.subscription_id as string | null,
        status_detail: row.status_detail as string | null,
        planName: (plan?.name as string | null) ?? null,
      }),
      counterparty: profile?.full_name ?? profile?.display_name ?? profile?.email ?? null,
      amount_cents: resolvePaymentRevenueCents(row),
      date: (row.paid_at as string) ?? (row.created_at as string),
      source: 'payment',
    });
  }

  for (const row of refunds) {
    movements.push({
      id: row.id as string,
      kind: 'refund',
      label: 'Reembolso / contestação',
      counterparty: null,
      amount_cents: -(row.amount_cents as number),
      date: (row.updated_at as string) ?? (row.paid_at as string),
      source: 'payment',
    });
  }

  for (const expense of expenses) {
    if (expense.status === 'cancelled') continue;
    movements.push({
      id: expense.id,
      kind: expense.status === 'pending' ? 'expense_pending' : 'expense',
      label: expense.description,
      counterparty: expense.vendor,
      amount_cents: -expense.amount_cents,
      date: expense.paid_at ?? expense.expense_date,
      source: 'expense',
      categoryName: expense.categoryName,
    });
  }

  return movements
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

export async function getFinancialDashboard(
  admin: SupabaseClient,
  period: AdminFinancialPeriod = '30d'
): Promise<AdminFinancialDashboard> {
  const [summary, profit, cashFlow, profitByMonth, movements, categories] =
    await Promise.all([
      getFinancialSummary(admin, period),
      getProfitSummary(admin, period),
      getCashFlowByMonth(admin),
      getProfitByMonth(admin),
      listFinancialMovements(admin, {
        ...getFinancialPeriodBounds(period),
        limit: 50,
      }),
      listFinancialCategories(admin),
    ]);

  return { summary, profit, cashFlow, profitByMonth, movements, categories };
}
