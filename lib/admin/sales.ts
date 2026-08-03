import type { SupabaseClient } from '@supabase/supabase-js';
import type { BillingTerm } from '@/lib/checkout/combo-billing';
import { isComboTerm } from '@/lib/checkout/combo-billing';
import { getComboTermLabel } from '@/lib/checkout/combo-display';
import { parseStoreOrderMeta } from '@/lib/asaas/store-order-payment';
import {
  parseDailySalesFilters,
  resolveDailySalesBounds,
} from '@/lib/admin/daily-sales';
import { brazilDateToEndIso, brazilDateToStartIso, toBrazilDateKey } from '@/lib/datetime/brazil';
import {
  parseAdminListPagination,
  paginateList,
} from '@/lib/admin/list-pagination';
import {
  buildRevenueCountIndexes,
  resolvePaymentRevenueCents,
  shouldCountInAdminSales,
  shouldCountPaymentInRevenue,
  type RevenuePaymentRow,
} from '@/lib/payments/revenue-aggregation';
import {
  isComboInstallmentSlicePayment,
  isComboUpgradePayment,
  parseComboPaymentDetail,
  resolveEffectivePaymentAmountCents,
  resolvePaymentInstallments,
} from '@/lib/payments/effective-amount';
import type { PaymentStatus } from '@/lib/dashboard/types';
import type {
  AdminSaleRow,
  AdminSaleType,
  AdminSalesListFilters,
  AdminSalesPageSummary,
  AdminSalesSortField,
  AdminSaleTableGroup,
} from '@/lib/admin/sales-types';
import { groupAdminSalesRows } from '@/lib/admin/sales-grouping';

export type {
  AdminSaleRow,
  AdminSaleType,
  AdminSalesListFilters,
  AdminSalesPageSummary,
  AdminSaleTableGroup,
} from '@/lib/admin/sales-types';
export { groupAdminSalesRows } from '@/lib/admin/sales-grouping';

const SALE_TYPE_LABEL: Record<AdminSaleType, string> = {
  assinatura: 'Assinatura',
  loja_avulsa: 'Loja avulsa',
  loja_bundled: 'Loja + assinatura',
  outro: 'Outro',
};

function emptySummaryByType(): Record<
  AdminSaleType,
  { count: number; revenueCents: number }
> {
  return {
    assinatura: { count: 0, revenueCents: 0 },
    loja_avulsa: { count: 0, revenueCents: 0 },
    loja_bundled: { count: 0, revenueCents: 0 },
    outro: { count: 0, revenueCents: 0 },
  };
}

function saleDayKey(row: AdminSaleRow): string | null {
  const raw = row.paid_at ?? row.created_at;
  return raw ? toBrazilDateKey(raw) : null;
}

function matchesSearch(row: AdminSaleRow, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;

  const haystack = [
    row.customerName,
    row.customerEmail,
    row.description,
    row.planName,
    row.saleTypeLabel,
    row.payment_method,
    row.asaasPaymentId,
    row.id,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(needle);
}

export function parseAdminSalesListFilters(
  searchParams: Record<string, string | undefined>
): AdminSalesListFilters {
  const chartFilters = parseDailySalesFilters(searchParams);
  const { from, to, periodLabel } = resolveDailySalesBounds(chartFilters);
  const pagination = parseAdminListPagination(searchParams, {
    defaultSort: 'paid_at',
    defaultOrder: 'desc',
    allowedSorts: ['paid_at', 'created_at', 'amount', 'customer'] satisfies AdminSalesSortField[],
  });

  const typeRaw = searchParams.type?.trim();
  const saleType =
    typeRaw === 'assinatura' ||
    typeRaw === 'loja_avulsa' ||
    typeRaw === 'loja_bundled' ||
    typeRaw === 'outro'
      ? typeRaw
      : undefined;

  return {
    q: searchParams.q?.trim() || undefined,
    status: searchParams.status?.trim() || undefined,
    saleType,
    from,
    to,
    periodLabel,
    page: pagination.page,
    pageSize: pagination.pageSize,
    sort: pagination.sort as AdminSalesSortField,
    order: pagination.order,
  };
}

function saleSortTimestamp(row: AdminSaleRow): number {
  const raw = row.paid_at ?? row.created_at;
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function sortAdminSales(
  rows: AdminSaleRow[],
  sort: AdminSalesSortField = 'paid_at',
  order: 'asc' | 'desc' = 'desc'
): AdminSaleRow[] {
  const direction = order === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    let cmp = 0;

    switch (sort) {
      case 'created_at':
        cmp = saleSortTimestamp(a) - saleSortTimestamp(b);
        if (cmp === 0) {
          cmp = (a.created_at ?? '').localeCompare(b.created_at ?? '');
        }
        break;
      case 'amount':
        cmp = a.effectiveAmountCents - b.effectiveAmountCents;
        break;
      case 'customer': {
        const aName = (a.customerName ?? a.customerEmail ?? '').toLowerCase();
        const bName = (b.customerName ?? b.customerEmail ?? '').toLowerCase();
        cmp = aName.localeCompare(bName, 'pt-BR');
        break;
      }
      case 'paid_at':
      default:
        cmp = saleSortTimestamp(a) - saleSortTimestamp(b);
        break;
    }

    if (cmp === 0) {
      cmp = a.id.localeCompare(b.id);
    }

    return cmp * direction;
  });
}

export function filterAdminSales(
  rows: AdminSaleRow[],
  filters: Pick<AdminSalesListFilters, 'q' | 'saleType' | 'from' | 'to'>
): AdminSaleRow[] {
  return rows.filter((row) => {
    const day = saleDayKey(row);
    if (!day || day < filters.from || day > filters.to) return false;
    if (filters.saleType && row.saleType !== filters.saleType) return false;
    if (filters.q && !matchesSearch(row, filters.q)) return false;
    return true;
  });
}

export function summarizeAdminSales(rows: AdminSaleRow[]): Omit<
  AdminSalesPageSummary,
  'periodLabel' | 'from' | 'to' | 'page' | 'pageSize' | 'total' | 'totalPages'
> {
  const groups = groupAdminSalesRows(rows);
  const hiddenInstallmentCount = groups.reduce(
    (sum, group) => sum + group.installments.length,
    0
  );
  const byType = emptySummaryByType();
  let approvedCount = 0;
  let pendingCount = 0;
  let revenueCents = 0;

  for (const row of rows) {
    if (row.status === 'approved') {
      if (row.countsInSales) {
        approvedCount += 1;
        revenueCents += row.effectiveAmountCents;
        byType[row.saleType].count += 1;
        byType[row.saleType].revenueCents += row.effectiveAmountCents;
      }
    } else if (row.status === 'pending') {
      pendingCount += 1;
    }
  }

  return {
    filteredCount: rows.length,
    visibleCount: groups.length,
    hiddenInstallmentCount,
    approvedCount,
    pendingCount,
    revenueCents,
    byType,
  };
}

function mapPaymentRow(
  row: Record<string, unknown>,
  indexes: ReturnType<typeof buildRevenueCountIndexes>
): AdminSaleRow {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const subscription = Array.isArray(row.subscriptions)
    ? row.subscriptions[0]
    : row.subscriptions;
  const plan = subscription?.plans
    ? Array.isArray(subscription.plans)
      ? subscription.plans[0]
      : subscription.plans
    : null;
  const planName = (plan?.name as string | null) ?? null;
  const subContext = subscription as {
    billing_term?: string | null;
    combo_total_cents?: number | null;
    combo_installments?: number | null;
    prepaid_months?: number | null;
    prepaid_until?: string | null;
    started_at?: string | null;
  } | null;

  const paymentData = {
    amount_cents: row.amount_cents as number,
    status_detail: row.status_detail as string | null,
    installments: row.installments as number | null,
  };
  const isComboInstallmentSlice = isComboInstallmentSlicePayment(
    paymentData,
    subContext
  );
  const effectiveAmountCents = resolveEffectivePaymentAmountCents(
    paymentData,
    subContext
  );
  const installmentCount = resolvePaymentInstallments(paymentData, subContext);
  const billingTerm = (subContext?.billing_term ?? 'monthly') as BillingTerm;
  const hasComboPurchase = (subContext?.combo_total_cents ?? 0) > 0;
  const comboLabel =
    !isComboInstallmentSlice &&
    (isComboTerm(billingTerm) || hasComboPurchase)
      ? isComboTerm(billingTerm)
        ? getComboTermLabel(billingTerm)
        : 'Combo'
      : null;

  const revenueRow = row as unknown as RevenuePaymentRow;
  const countsInRevenue = shouldCountPaymentInRevenue(
    revenueRow,
    indexes.canonicalComboBySubscription,
    indexes.comboPrepaidDayBySubscription,
    indexes.canonicalMonthlyBySubscriptionMonth,
    indexes.firstPaymentBySubscription
  );
  const countsInSales = shouldCountInAdminSales(revenueRow, indexes);

  const { saleType, description } = classifyAdminSale({
    subscription_id: row.subscription_id as string | null,
    status_detail: row.status_detail as string | null,
    planName,
    billingTerm: subContext?.billing_term,
    isComboInstallmentSlice,
  });

  return {
    id: row.id as string,
    userId: row.user_id as string,
    saleType,
    saleTypeLabel: SALE_TYPE_LABEL[saleType],
    customerName: profile?.full_name ?? profile?.display_name ?? null,
    customerEmail: profile?.email ?? null,
    description,
    amount_cents: row.amount_cents as number,
    effectiveAmountCents,
    installmentCount,
    comboLabel,
    status: row.status as PaymentStatus,
    payment_method: (row.payment_method as string | null) ?? null,
    paid_at: (row.paid_at as string | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
    subscriptionId: (row.subscription_id as string | null) ?? null,
    planName,
    asaasPaymentId: (row.asaas_payment_id as string | null) ?? null,
    isComboInstallmentSlice,
    countsInRevenue,
    countsInSales,
  };
}

function describeStoreOrder(meta: ReturnType<typeof parseStoreOrderMeta>): string {
  if (!meta?.items.length) return 'Pedido da loja';
  return meta.items
    .map((line) => (line.quantity > 1 ? `${line.name} ×${line.quantity}` : line.name))
    .join(', ');
}

export function classifyAdminSale(row: {
  subscription_id: string | null;
  status_detail: string | null;
  planName: string | null;
  billingTerm?: string | null;
  isComboInstallmentSlice?: boolean;
}): { saleType: AdminSaleType; description: string } {
  const comboDetail = parseComboPaymentDetail(row.status_detail);
  const storeMeta = parseStoreOrderMeta(row.status_detail);

  if (storeMeta) {
    const description = describeStoreOrder(storeMeta);
    if (
      storeMeta.shippingMode === 'with_subscription' ||
      storeMeta.bundleSubscriptionId ||
      storeMeta.items.some((item) => item.bundleSubscriptionId)
    ) {
      return { saleType: 'loja_bundled', description };
    }
    return { saleType: 'loja_avulsa', description };
  }

  if (row.subscription_id) {
    const billingTerm = (row.billingTerm ?? 'monthly') as BillingTerm;
    if (row.isComboInstallmentSlice) {
      return {
        saleType: 'assinatura',
        description: row.planName
          ? `Parcela do combo — ${row.planName}`
          : 'Parcela do combo',
      };
    }
    if (comboDetail || isComboTerm(billingTerm)) {
      const comboLabel = isComboTerm(billingTerm)
        ? getComboTermLabel(billingTerm)
        : comboDetail?.billing_term && isComboTerm(comboDetail.billing_term)
          ? getComboTermLabel(comboDetail.billing_term)
          : 'Combo';
      const upgradePrefix = isComboUpgradePayment(row.status_detail)
        ? 'Upgrade '
        : '';
      return {
        saleType: 'assinatura',
        description: row.planName
          ? `${upgradePrefix}${comboLabel} — ${row.planName}`
          : `${upgradePrefix}${comboLabel}`,
      };
    }
    return {
      saleType: 'assinatura',
      description: row.planName ? `Assinatura — ${row.planName}` : 'Assinatura',
    };
  }

  return { saleType: 'outro', description: 'Pagamento' };
}

export async function listAdminSales(
  admin: SupabaseClient,
  filters: Partial<AdminSalesListFilters> & { limit?: number } = {}
): Promise<AdminSaleRow[]> {
  const limit = filters.limit ?? 5000;
  let query = admin
    .from('payments')
    .select(
      `
      id,
      user_id,
      subscription_id,
      asaas_payment_id,
      amount_cents,
      status,
      status_detail,
      payment_method,
      paid_at,
      created_at,
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
    `
    )
    .order('paid_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.from && filters.to) {
    const paidFrom = brazilDateToStartIso(filters.from);
    const paidTo = brazilDateToEndIso(filters.to);
    query = query.or(
      `and(paid_at.gte."${paidFrom}",paid_at.lte."${paidTo}"),and(paid_at.is.null,created_at.gte."${paidFrom}",created_at.lte."${paidTo}")`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error('[admin] listAdminSales:', error.message);
    return [];
  }

  const revenueRows = (data ?? []) as RevenuePaymentRow[];
  const indexes = buildRevenueCountIndexes(revenueRows);

  const rows = (data ?? [])
    .map((row) => mapPaymentRow(row as Record<string, unknown>, indexes))
    .filter((row) => row.status !== 'approved' || row.countsInSales);

  if (!filters.q && !filters.saleType) {
    return rows;
  }

  return filterAdminSales(rows, {
    q: filters.q,
    saleType: filters.saleType,
    from: filters.from ?? '1970-01-01',
    to: filters.to ?? '2999-12-31',
  });
}

export async function getAdminSalesPageData(
  admin: SupabaseClient,
  searchParams: Record<string, string | undefined> = {}
): Promise<{
  filters: AdminSalesListFilters;
  sales: AdminSaleRow[];
  summary: AdminSalesPageSummary;
}> {
  const filters = parseAdminSalesListFilters(searchParams);
  const allSales = sortAdminSales(
    await listAdminSales(admin, filters),
    filters.sort,
    filters.order
  );
  const allGroups = groupAdminSalesRows(allSales);
  const paginatedGroups = paginateList(
    allGroups,
    filters.page ?? 1,
    filters.pageSize ?? 25
  );
  const sales = paginatedGroups.items.flatMap((group) => [
    group.main,
    ...group.installments,
  ]);
  const summary = {
    ...summarizeAdminSales(allSales),
    periodLabel: filters.periodLabel,
    from: filters.from,
    to: filters.to,
    page: paginatedGroups.page,
    pageSize: paginatedGroups.pageSize,
    total: paginatedGroups.total,
    totalPages: paginatedGroups.totalPages,
  };

  return { filters, sales, summary };
}

export async function getAdminSalesSummary(
  admin: SupabaseClient
): Promise<Record<AdminSaleType, { count: number; revenueCents: number }>> {
  const { data, error } = await admin
    .from('payments')
    .select(
      `
      id,
      subscription_id,
      amount_cents,
      status_detail,
      installments,
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
    .order('paid_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(5000);

  const summary: Record<AdminSaleType, { count: number; revenueCents: number }> = {
    assinatura: { count: 0, revenueCents: 0 },
    loja_avulsa: { count: 0, revenueCents: 0 },
    loja_bundled: { count: 0, revenueCents: 0 },
    outro: { count: 0, revenueCents: 0 },
  };

  if (error) {
    console.error('[admin] getAdminSalesSummary:', error.message);
    return summary;
  }

  const rows = (data ?? []) as RevenuePaymentRow[];
  const indexes = buildRevenueCountIndexes(rows);

  for (const row of rows) {
    if (
      !shouldCountPaymentInRevenue(
        row,
        indexes.canonicalComboBySubscription,
        indexes.comboPrepaidDayBySubscription,
        indexes.canonicalMonthlyBySubscriptionMonth,
        indexes.firstPaymentBySubscription
      )
    ) {
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

    const subContext = subscription as {
      billing_term?: string | null;
      combo_total_cents?: number | null;
      combo_installments?: number | null;
    } | null;
    const paymentData = {
      amount_cents: row.amount_cents as number,
      status_detail: row.status_detail as string | null,
      installments: row.installments as number | null,
    };
    const isComboInstallmentSlice = isComboInstallmentSlicePayment(
      paymentData,
      subContext
    );

    const { saleType } = classifyAdminSale({
      subscription_id: row.subscription_id,
      status_detail: row.status_detail,
      planName: (plan?.name as string | null) ?? null,
      billingTerm: subContext?.billing_term,
      isComboInstallmentSlice,
    });

    summary[saleType].count += 1;
    summary[saleType].revenueCents += resolvePaymentRevenueCents(row);
  }

  return summary;
}
