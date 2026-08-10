import type { SupabaseClient } from '@supabase/supabase-js';
import { unstable_cache } from 'next/cache';
import { getOperationChartPeriod } from '@/lib/admin/chart-period';
import { ADMIN_FINANCE_CACHE_TAG } from '@/lib/admin/cache-tags';
import { getFinancialPeriodBounds } from '@/lib/admin/finance';
import {
  sumComboCycleProductionCosts,
  sumComboCycleProductionCostsByMonth,
} from '@/lib/admin/combo-cycle-cost';
import {
  fetchApprovedPaymentsForOrderCost,
  loadFirstApprovedPaymentIdBySubscription,
  loadOrderCostCatalog,
  resolvePaymentOrderCostCents,
} from '@/lib/admin/payment-order-cost';
import type {
  AdminFinancialPeriod,
  AdminProfitMonthRow,
  AdminProfitSummary,
} from '@/lib/admin/types';
import {
  buildRevenueCountIndexes,
  resolvePaymentRevenueCents,
  shouldCountPaymentInRevenue,
  sumPaymentRevenueCents,
  type RevenuePaymentRow,
} from '@/lib/payments/revenue-aggregation';
import { createAdminClient } from '@/lib/supabase/admin';

const ADMIN_FINANCE_REVALIDATE_SECONDS = 120;

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(
    date
  );
}

function buildProfitSummary(
  salesCents: number,
  orderCostCents: number
): AdminProfitSummary {
  const profitCents = salesCents - orderCostCents;
  const marginPercent =
    salesCents > 0 ? Math.round((profitCents / salesCents) * 100) : null;

  return {
    salesCents,
    orderCostCents,
    profitCents,
    marginPercent,
  };
}

function sumPaymentRevenue(
  payments: Array<{
    id: string;
    amount_cents: number;
    status_detail: string | null;
    installments?: number | null;
    subscription_id?: string | null;
    paid_at?: string | null;
    created_at?: string | null;
    subscriptions: unknown;
  }>
): number {
  return sumPaymentRevenueCents(payments as RevenuePaymentRow[]);
}

async function sumOrderCostsForPayments(
  admin: SupabaseClient,
  payments: Awaited<ReturnType<typeof fetchApprovedPaymentsForOrderCost>>
): Promise<number> {
  if (payments.length === 0) return 0;

  const subscriptionIds = Array.from(
    new Set(
      payments
        .map((payment) => payment.subscription_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const [catalog, firstPaymentIdBySubscription] = await Promise.all([
    loadOrderCostCatalog(admin),
    loadFirstApprovedPaymentIdBySubscription(admin, subscriptionIds),
  ]);

  return payments.reduce(
    (sum, payment) =>
      sum +
      resolvePaymentOrderCostCents(catalog, payment, firstPaymentIdBySubscription),
    0
  );
}

export async function getProfitSummary(
  _admin?: SupabaseClient,
  period: AdminFinancialPeriod = '30d'
): Promise<AdminProfitSummary> {
  return unstable_cache(
    async () => {
      const admin = createAdminClient();
      const { from, to } = getFinancialPeriodBounds(period);

      const payments = await fetchApprovedPaymentsForOrderCost(admin, from, to);
      const [salesCents, paymentOrderCostCents, comboCycleCostCents] =
        await Promise.all([
          Promise.resolve(sumPaymentRevenue(payments)),
          sumOrderCostsForPayments(admin, payments),
          sumComboCycleProductionCosts(admin, from, to),
        ]);

      return buildProfitSummary(
        salesCents,
        paymentOrderCostCents + comboCycleCostCents
      );
    },
    ['admin-profit-summary', period],
    {
      revalidate: ADMIN_FINANCE_REVALIDATE_SECONDS,
      tags: [ADMIN_FINANCE_CACHE_TAG],
    }
  )();
}

export async function getProfitByMonth(
  _admin?: SupabaseClient
): Promise<AdminProfitMonthRow[]> {
  return unstable_cache(
    async () => {
      const admin = createAdminClient();
      const { from, to, monthKeys } = getOperationChartPeriod();

      const payments = await fetchApprovedPaymentsForOrderCost(admin, from, to);

      const subscriptionIds = Array.from(
        new Set(
          payments
            .map((payment) => payment.subscription_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      const [catalog, firstPaymentIdBySubscription, comboCostsByMonth] =
        await Promise.all([
          loadOrderCostCatalog(admin),
          loadFirstApprovedPaymentIdBySubscription(admin, subscriptionIds),
          sumComboCycleProductionCostsByMonth(admin, from, to),
        ]);

      const buckets = new Map<
        string,
        { salesCents: number; orderCostCents: number }
      >();

      for (const key of monthKeys) {
        buckets.set(key, { salesCents: 0, orderCostCents: 0 });
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

        const paidAt = payment.paid_at ?? payment.created_at;
        if (!paidAt) continue;

        const key = monthKey(paidAt);
        const bucket = buckets.get(key);
        if (!bucket) continue;

        bucket.salesCents += resolvePaymentRevenueCents(payment);

        bucket.orderCostCents += resolvePaymentOrderCostCents(
          catalog,
          payment as Parameters<typeof resolvePaymentOrderCostCents>[1],
          firstPaymentIdBySubscription
        );
      }

      for (const [month, comboCostCents] of Array.from(
        comboCostsByMonth.entries()
      )) {
        const bucket = buckets.get(month);
        if (bucket) bucket.orderCostCents += comboCostCents;
      }

      return monthKeys.map((month) => {
        const row = buckets.get(month) ?? { salesCents: 0, orderCostCents: 0 };
        const summary = buildProfitSummary(row.salesCents, row.orderCostCents);

        return {
          month,
          label: monthLabel(month),
          salesCents: summary.salesCents,
          costCents: summary.orderCostCents,
          profitCents: summary.profitCents,
          marginPercent: summary.marginPercent,
        };
      });
    },
    ['admin-profit-by-month'],
    {
      revalidate: ADMIN_FINANCE_REVALIDATE_SECONDS,
      tags: [ADMIN_FINANCE_CACHE_TAG],
    }
  )();
}
