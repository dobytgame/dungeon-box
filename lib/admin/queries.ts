import type { SupabaseClient } from '@supabase/supabase-js';
import type { BillingTerm } from '@/lib/checkout/combo-billing';
import { isComboTerm } from '@/lib/checkout/combo-billing';
import { getComboTermLabel } from '@/lib/checkout/combo-display';
import { relOne } from '@/lib/dashboard/format';
import {
  buildCycleShipmentItems,
  loadAddonPaymentsBySubscription,
  listBundledStoreOrdersBySubscription,
  loadSiblingCyclesBySubscription,
  shipmentItemTags,
  type CycleShipmentContext,
} from '@/lib/admin/cycle-shipment-items';
import {
  buildPlanProductionCostMap,
  resolveCycleShipmentFinance,
} from '@/lib/admin/cycle-shipment-finance';
import { mergeMonthlyKitProductionCosts } from '@/lib/admin/store-products';
import {
  loadPaymentContextByIds,
  loadSubscriptionPaymentMaps,
  pickCyclePaymentContext,
  resolveComboPurchaseAnchor,
  resolveComboStartCycleNumber,
  resolveCycleEffectivePaidAt,
  resolveKanbanSubscriptionCreatedAt,
  paymentRecordedAt,
} from '@/lib/admin/cycle-payment-resolve';
import { resolveSubscriptionMonthlyRevenueCents } from '@/lib/admin/subscription-monthly-revenue';
import { loadSubscriptionPlanUpgradeInfoByIds } from '@/lib/admin/subscription-plan-upgrade';
import { compareCyclesByKitPaymentDate } from '@/lib/subscriptions/cycle-production';
import { formatProductionShippingAddress } from '@/lib/admin/production-list';
import {
  buildProductionSubscriptionMeta,
  filterProductionBoardRows,
  filterProductionBoardRowsForCycle,
  groupProductionBoardRows,
} from '@/lib/admin/production-board-filter';
import { monthKeyFromDate } from '@/lib/admin/chart-period';
import type { Payment, Plan, Subscription, SubscriptionCycle, Theme } from '@/lib/dashboard/types';
import type {
  AdminActivePlanCount,
  AdminCustomerDetail,
  AdminCustomerPlanChange,
  AdminCustomerRow,
  AdminCycleRow,
  AdminDashboardStats,
  AdminListFilters,
  AdminPartnerRow,
  AdminPaymentRow,
  AdminPlanRow,
  AdminPromoCodeRow,
  AdminAuditRow,
  AdminPromoRedemptionRow,
  AdminSubscriptionRow,
  AdminUserPlanStats,
} from './types';
import {
  parseAdminListPagination,
  type AdminPaginatedResult,
} from '@/lib/admin/list-pagination';
import {
  getAdminPartnerReferralStats,
  loadReferralAttributionByReferredIds,
} from '@/lib/admin/referral-attribution';
import { getProfitByMonth, getProfitSummary } from '@/lib/admin/profit-analytics';
import { getTotalApprovedRevenue } from '@/lib/admin/finance';
import {
  resolveEffectivePaymentAmountCents,
  resolvePaymentInstallments,
  isComboInstallmentSlicePayment,
} from '@/lib/payments/effective-amount';
import { sumPaymentRevenueCents, type RevenuePaymentRow } from '@/lib/payments/revenue-aggregation';
import {
  integrateStandaloneStoreOrdersIntoCycleBoard,
  integrateStandaloneStoreOrdersIntoOverviewBoard,
  listStandaloneStoreOrdersForProduction,
} from '@/lib/admin/standalone-store-production';

function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

type SubscriptionComboContext = {
  billing_term?: string | null;
  combo_total_cents?: number | null;
  combo_installments?: number | null;
};

function mapPaymentRow(
  row: Record<string, unknown>
): AdminPaymentRow {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
  const subscription = Array.isArray(row.subscriptions)
    ? row.subscriptions[0]
    : row.subscriptions;
  const plan = subscription?.plans
    ? Array.isArray(subscription.plans)
      ? subscription.plans[0]
      : subscription.plans
    : null;
  const subContext = subscription as SubscriptionComboContext | null | undefined;

  const { profiles: _p, subscriptions: _s, ...payment } = row;
  const paymentData = payment as unknown as Payment;

  const effectiveAmountCents = resolveEffectivePaymentAmountCents(
    paymentData,
    subContext
  );
  const installmentCount = resolvePaymentInstallments(paymentData, subContext);
  const billingTerm = (subContext?.billing_term ?? 'monthly') as BillingTerm;
  const comboLabel = isComboTerm(billingTerm) ? getComboTermLabel(billingTerm) : null;
  const isComboInstallmentSlice = isComboInstallmentSlicePayment(
    paymentData,
    subContext
  );

  return {
    ...paymentData,
    customerName: profile?.full_name ?? profile?.display_name ?? null,
    customerEmail: profile?.email ?? null,
    planName: plan?.name ?? null,
    effectiveAmountCents,
    installmentCount,
    comboLabel,
    isComboInstallmentSlice,
  };
}

export async function getAdminUserPlanStats(
  admin: SupabaseClient
): Promise<AdminUserPlanStats> {
  const [profilesRes, activeSubsRes] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('subscriptions').select('user_id').eq('status', 'active'),
  ]);

  const totalProfiles = profilesRes.count ?? 0;
  const withActivePlan = new Set(
    (activeSubsRes.data ?? []).map((row) => row.user_id as string)
  ).size;
  const withoutActivePlan = Math.max(0, totalProfiles - withActivePlan);

  return { totalProfiles, withActivePlan, withoutActivePlan };
}

export async function getAdminActivePlanCounts(
  admin: SupabaseClient
): Promise<AdminActivePlanCount[]> {
  const { data: plans } = await admin
    .from('plans')
    .select('id, name, slug, sort_order')
    .order('sort_order', { ascending: true });

  if (!plans?.length) return [];

  const { data: subscriptions } = await admin
    .from('subscriptions')
    .select('plan_id')
    .eq('status', 'active');

  const counts = new Map<string, number>();
  for (const sub of subscriptions ?? []) {
    const planId = sub.plan_id as string;
    counts.set(planId, (counts.get(planId) ?? 0) + 1);
  }

  return plans.map((plan) => ({
    planName: plan.name as string,
    planSlug: plan.slug as string,
    subscribers: counts.get(plan.id as string) ?? 0,
  }));
}

const ADMIN_CYCLE_LIST_SELECT = `
  id,
  subscription_id,
  cycle_number,
  status,
  tracking_code,
  carrier,
  shipped_at,
  paid_at,
  created_at,
  scheduled_production_month,
  amount_cents,
  shipping_cost_cents,
  payment_id,
  production_notes,
  feedback_request_sent_at,
  themes(name),
  subscriptions(
    status,
    current_cycle,
    user_id,
    started_at,
    created_at,
    billing_term,
    combo_total_cents,
    combo_installments,
    special_notes,
    shipping_cents,
    is_partner,
    profiles(full_name, display_name, email),
    plans!plan_id(name, slug, production_cost_cents, price_cents),
    addresses(street, number, complement, neighborhood, city, state, zip_code, recipient)
  )
`;

function mapCycleRow(row: Record<string, unknown>): AdminCycleRow {
  const subscription = relOne(
    row.subscriptions as Record<string, unknown> | Record<string, unknown>[] | null
  );
  const profile = relOne(
    subscription?.profiles as Record<string, unknown> | Record<string, unknown>[] | null
  );
  const plan = relOne(
    subscription?.plans as Record<string, unknown> | Record<string, unknown>[] | null
  );
  const address = relOne(
    subscription?.addresses as Record<string, unknown> | Record<string, unknown>[] | null
  );
  const theme = relOne(
    row.themes as Record<string, unknown> | Record<string, unknown>[] | null
  );

  const scheduledProductionMonth =
    (row.scheduled_production_month as string | null) ?? null;
  const paidAt = (row.paid_at as string | null) ?? null;
  const createdAt = (row.created_at as string | null) ?? null;

  return {
    id: row.id as string,
    subscription_id: row.subscription_id as string,
    cycle_number: row.cycle_number as number,
    status: row.status as AdminCycleRow['status'],
    tracking_code: (row.tracking_code as string | null) ?? null,
    carrier: (row.carrier as string | null) ?? null,
    shipped_at: (row.shipped_at as string | null) ?? null,
    paid_at: paidAt,
    created_at: createdAt,
    scheduledProductionMonth,
    amount_cents: (row.amount_cents as number | null) ?? null,
    shipping_cost_cents: (row.shipping_cost_cents as number | null) ?? null,
    payment_id: (row.payment_id as string | null) ?? null,
    productionNotes: (row.production_notes as string | null) ?? null,
    customerName:
      (profile?.full_name as string | null) ??
      (profile?.display_name as string | null) ??
      null,
    customerEmail: (profile?.email as string | null) ?? null,
    planName: (plan?.name as string | null) ?? null,
    planSlug: (plan?.slug as string | null) ?? null,
    planProductionCostCents:
      (plan?.production_cost_cents as number | null) ?? 0,
    themeName: (theme?.name as string | null) ?? null,
    city: (address?.city as string | null) ?? null,
    state: (address?.state as string | null) ?? null,
    shippingAddressLine: formatProductionShippingAddress(
      address as {
        street?: string | null;
        number?: string | null;
        complement?: string | null;
        neighborhood?: string | null;
        city?: string | null;
        state?: string | null;
        zip_code?: string | null;
        recipient?: string | null;
      } | null
    ),
    userId: (subscription?.user_id as string | null) ?? null,
    subscriptionStatus: (subscription?.status as string | null) ?? null,
    subscriptionContractedAt:
      (subscription?.created_at as string | null) ??
      (subscription?.started_at as string | null) ??
      null,
    subscriptionStartedAt: (subscription?.started_at as string | null) ?? null,
    currentCyclePaidAt: paidAt,
    comboPurchasePaidAt: null,
    comboStartCycleNumber: null,
    subscriptionCurrentCycle:
      (subscription?.current_cycle as number | null) ?? null,
    subscriptionBillingTerm: (subscription?.billing_term as string | null) ?? null,
    isPartner: Boolean(subscription?.is_partner),
    hasBundledItems: false,
    bundledItemTags: [],
    extraItems: [],
    totalRevenueCents: null,
    shipmentMarginCents: null,
    hasBundledRevenue: false,
    paymentPendingHighlight: false,
    feedbackRequestSentAt:
      (row.feedback_request_sent_at as string | null) ?? null,
  };
}

function isComboPrepaidFutureCycle(row: AdminCycleRow): boolean {
  const term = row.subscriptionBillingTerm;
  if (!term || !isComboTerm(term as BillingTerm)) return false;
  return row.cycle_number > 1 && Boolean(row.payment_id);
}

function resolvePaymentPendingHighlight(
  row: AdminCycleRow,
  extraItems: AdminCycleRow['extraItems']
): boolean {
  const bundledPending = extraItems.some((item) => item.paymentPending);
  if (row.isPartner) return bundledPending;
  if (row.paid_at) return bundledPending;
  if (isComboPrepaidFutureCycle(row)) return bundledPending;
  return true;
}

function toShipmentContext(row: AdminCycleRow): CycleShipmentContext {
  return {
    cycleId: row.id,
    cycleNumber: row.cycle_number,
    subscriptionId: row.subscription_id,
    status: row.status,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    paymentId: row.payment_id,
  };
}

async function enrichCycleRowsWithShipmentItems(
  admin: SupabaseClient,
  rows: AdminCycleRow[],
  rawRows: Record<string, unknown>[],
  siblingCyclesBySub?: Map<string, CycleShipmentContext[]>
): Promise<AdminCycleRow[]> {
  if (rows.length === 0) return rows;

  const subscriptionIds = Array.from(
    new Set(rows.map((row) => row.subscription_id))
  );
  const storeOrdersBySub = await listBundledStoreOrdersBySubscription(
    admin,
    subscriptionIds
  );

  const [{ data: plansData }, addonPaymentsBySub] = await Promise.all([
    admin.from('plans').select('slug, production_cost_cents'),
    loadAddonPaymentsBySubscription(admin, subscriptionIds),
  ]);

  const planProductionBySlug = await mergeMonthlyKitProductionCosts(
    admin,
    buildPlanProductionCostMap(
      (plansData ?? []) as Array<{ slug: string; production_cost_cents: number }>
    )
  );
  const addonPaymentsMap = addonPaymentsBySub;

  const paymentIds = Array.from(
    new Set(
      rows
        .map((row) => row.payment_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const [paymentsById, paymentMaps] = await Promise.all([
    loadPaymentContextByIds(admin, paymentIds),
    loadSubscriptionPaymentMaps(admin, subscriptionIds),
  ]);

  const siblingsBySub =
    siblingCyclesBySub ??
    (await loadSiblingCyclesBySubscription(admin, subscriptionIds));

  const rawById = new Map(
    rawRows.map((row) => [row.id as string, row])
  );

  return rows.map((row) => {
    const raw = rawById.get(row.id);
    const subscription = relOne(
      raw?.subscriptions as Record<string, unknown> | Record<string, unknown>[] | null
    );
    const specialNotes = (subscription?.special_notes as string | null) ?? null;
    const subscriptionContext = {
      billing_term: (subscription?.billing_term as string | null) ?? null,
      combo_total_cents: (subscription?.combo_total_cents as number | null) ?? null,
      combo_installments:
        (subscription?.combo_installments as number | null) ?? null,
    };
    const billingTerm =
      row.subscriptionBillingTerm ?? subscriptionContext.billing_term;
    const plan = relOne(
      subscription?.plans as Record<string, unknown> | Record<string, unknown>[] | null
    );
    const linkedPayment = row.payment_id
      ? paymentsById.get(row.payment_id) ?? null
      : null;
    const comboPayment = paymentMaps.comboBySub.get(row.subscription_id) ?? null;
    const firstApproved =
      paymentMaps.firstApprovedBySub.get(row.subscription_id) ?? null;
    const comboPurchasePaidAt = isComboTerm(billingTerm)
      ? resolveComboPurchaseAnchor({
          cyclePaidAt: row.paid_at,
          linkedPaymentPaidAt: linkedPayment?.paid_at ?? null,
          linkedPaymentCreatedAt: linkedPayment?.created_at ?? null,
          comboPaymentPaidAt: comboPayment?.paid_at ?? null,
          comboPaymentCreatedAt: comboPayment?.created_at ?? null,
          firstApprovedPaymentPaidAt: firstApproved?.paid_at ?? null,
          firstApprovedPaymentCreatedAt: firstApproved?.created_at ?? null,
          subscriptionStartedAt:
            (subscription?.started_at as string | null) ?? null,
        })
      : null;

    const comboStartCycleNumber = resolveComboStartCycleNumber({
      billingTerm,
      paymentId: row.payment_id,
      comboPurchasePaidAt,
      siblings: (siblingsBySub.get(row.subscription_id) ?? []).map((sibling) => ({
        cycleNumber: sibling.cycleNumber,
        paymentId: sibling.paymentId ?? null,
        paidAt: sibling.paidAt ?? null,
      })),
    });

    const effectivePaidAt = resolveCycleEffectivePaidAt({
      cycleNumber: row.cycle_number,
      cyclePaidAt: row.paid_at,
      paymentId: row.payment_id,
      billingTerm,
      linkedPaymentPaidAt: linkedPayment?.paid_at ?? null,
      linkedPaymentCreatedAt: linkedPayment?.created_at ?? null,
      comboPaymentPaidAt: comboPayment?.paid_at ?? null,
      comboPaymentCreatedAt: comboPayment?.created_at ?? null,
      firstApprovedPaymentPaidAt: firstApproved?.paid_at ?? null,
      firstApprovedPaymentCreatedAt: firstApproved?.created_at ?? null,
      subscriptionStartedAt: (subscription?.started_at as string | null) ?? null,
      comboStartCycleNumber,
    });

    const subscriptionContractedAt =
      resolveKanbanSubscriptionCreatedAt({
        subscriptionCreatedAt: (subscription?.created_at as string | null) ?? null,
        startedAt: (subscription?.started_at as string | null) ?? null,
      }) ?? row.created_at;

    const currentCyclePaidAt =
      billingTerm && isComboTerm(billingTerm)
        ? effectivePaidAt
        : paymentRecordedAt(
            linkedPayment?.paid_at ?? row.paid_at,
            linkedPayment?.created_at ?? row.created_at
          ) ?? effectivePaidAt;

    const enrichedRow: AdminCycleRow = {
      ...row,
      subscriptionContractedAt,
      currentCyclePaidAt,
      paid_at: effectivePaidAt,
      comboPurchasePaidAt,
      comboStartCycleNumber: isComboTerm(billingTerm)
        ? comboStartCycleNumber
        : null,
    };

    let cyclePayment = pickCyclePaymentContext({
      paymentId: row.payment_id,
      amountCents: row.amount_cents,
      subscriptionId: row.subscription_id,
      billingTerm,
      linkedPayment,
      comboBySub: paymentMaps.comboBySub,
      latestBySub: paymentMaps.latestBySub,
    });
    const fallbackMonthlyRevenueCents = resolveSubscriptionMonthlyRevenueCents({
      planPriceCents: (plan?.price_cents as number | null) ?? null,
      shippingCents: (subscription?.shipping_cents as number | null) ?? null,
      specialNotes,
    });
    const storeOrders = storeOrdersBySub.get(row.subscription_id) ?? [];
    const siblingCycles =
      siblingsBySub.get(row.subscription_id) ?? [toShipmentContext(row)];

    const shipmentItems = buildCycleShipmentItems({
      cycle: toShipmentContext(enrichedRow),
      siblingCycles,
      specialNotes,
      storeOrders,
    });

    const finance = resolveCycleShipmentFinance({
      cycleAmountCents: row.amount_cents,
      cyclePaymentId: row.payment_id,
      cyclePayment,
      subscriptionContext,
      shippingCostCents: row.shipping_cost_cents,
      subscriptionPlanProductionCostCents: row.planProductionCostCents,
      planProductionBySlug,
      cycle: toShipmentContext(enrichedRow),
      siblingCycles,
      shipmentItems,
      storeOrders,
      addonPayments: addonPaymentsMap.get(row.subscription_id) ?? [],
      specialNotes,
      isPartner: row.isPartner,
      fallbackMonthlyRevenueCents,
    });

    const extraItems = shipmentItems.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      tag: item.tag,
      kind: item.kind,
      source: item.source,
      paymentPending: item.paymentPending,
    }));

    return {
      ...enrichedRow,
      hasBundledItems: extraItems.length > 0,
      bundledItemTags: shipmentItemTags(shipmentItems),
      extraItems,
      totalRevenueCents: finance.totalRevenueCents,
      shipmentMarginCents: finance.marginCents,
      hasBundledRevenue: finance.hasBundledRevenue,
      paymentPendingHighlight: resolvePaymentPendingHighlight(
        enrichedRow,
        extraItems
      ),
    };
  });
}

export async function getAdminDashboardStats(
  admin: SupabaseClient
): Promise<AdminDashboardStats> {
  const since30d = daysAgoIso(30);

  const [
    mrrRes,
    activeCountRes,
    newSubsRes,
    cancelledRes,
    preparingRes,
    pendingShipRes,
    pastDueRes,
    pendingSubsRes,
    payments30Res,
    recentPaymentsRes,
    shipQueueRes,
    userPlanStats,
    activePlanCounts,
    partnerReferralStats,
    profit30d,
    profitByMonth,
    totalRevenue,
  ] = await Promise.all([
    admin.from('mrr').select('*'),
    admin
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    admin
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .gte('started_at', since30d),
    admin
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'cancelled')
      .gte('cancelled_at', since30d),
    admin
      .from('subscription_cycles')
      .select('id', { count: 'exact', head: true })
      .in('status', ['production', 'preparing']),
    admin
      .from('subscription_cycles')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'preparing')
      .is('tracking_code', null),
    admin
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'past_due'),
    admin
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
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
        subscriptions(billing_term, combo_total_cents, combo_installments)
      `
      )
      .eq('status', 'approved')
      .gte('paid_at', since30d),
    admin
      .from('payments')
      .select(
        `
        *,
        profiles(full_name, display_name, email),
        subscriptions(
          billing_term,
          combo_total_cents,
          combo_installments,
          plans!plan_id(name)
        )
      `
      )
      .order('paid_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(8),
    admin
      .from('subscription_cycles')
      .select(
        `
        id,
        subscription_id,
        cycle_number,
        status,
        tracking_code,
        carrier,
        shipped_at,
        themes(name),
        subscriptions(
          profiles(full_name, display_name, email),
          plans!plan_id(name),
          addresses(city, state)
        )
      `
      )
      .eq('status', 'preparing')
      .order('created_at', { ascending: true })
      .limit(10),
    getAdminUserPlanStats(admin),
    getAdminActivePlanCounts(admin),
    getAdminPartnerReferralStats(admin),
    getProfitSummary(admin, '30d'),
    getProfitByMonth(admin),
    getTotalApprovedRevenue(admin),
  ]);

  const mrrRows = mrrRes.data ?? [];
  const mrrByPlan = mrrRows.map((row) => ({
    planName: row.name as string,
    subscribers: Number(row.subscribers ?? 0),
    mrrCents: Math.round(Number(row.mrr_brl ?? 0) * 100),
  }));
  const mrrCents = mrrByPlan.reduce((sum, row) => sum + row.mrrCents, 0);

  const approvedPayments = (payments30Res.data ?? []) as RevenuePaymentRow[];
  const revenueApproved30dCents = sumPaymentRevenueCents(approvedPayments);

  return {
    mrrCents,
    activeSubscribers: activeCountRes.count ?? 0,
    newSubscribers30d: newSubsRes.count ?? 0,
    cancelled30d: cancelledRes.count ?? 0,
    cyclesPreparing: preparingRes.count ?? 0,
    cyclesPendingShip: pendingShipRes.count ?? 0,
    pastDueCount: pastDueRes.count ?? 0,
    pendingSubscriptions: pendingSubsRes.count ?? 0,
    paymentsApproved30d: approvedPayments.length,
    revenueApproved30dCents,
    totalRevenueCents: totalRevenue.revenueCents,
    totalPaymentsApproved: totalRevenue.paymentCount,
    profit30d,
    profitByMonth,
    mrrByPlan,
    activePlanCounts,
    recentPayments: (recentPaymentsRes.data ?? []).map((row) =>
      mapPaymentRow(row as Record<string, unknown>)
    ),
    shipQueue: (shipQueueRes.data ?? []).map((row) =>
      mapCycleRow(row as Record<string, unknown>)
    ),
    userPlanStats,
    partnerReferralStats,
  };
}

export async function listAdminCustomers(
  admin: SupabaseClient,
  filters: AdminListFilters = {}
): Promise<AdminCustomerRow[]> {
  const limit = filters.limit ?? 50;
  let query = admin
    .from('profiles')
    .select('id, email, full_name, display_name, phone, cpf, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  const q = filters.q?.trim();
  if (q) {
    query = query.or(
      `email.ilike.%${q}%,full_name.ilike.%${q}%,display_name.ilike.%${q}%,cpf.ilike.%${q}%`
    );
  }

  const { data: profiles } = await query;
  if (!profiles?.length) return [];

  const ids = profiles.map((p) => p.id);
  const [subscriptionsRes, referralByUserId] = await Promise.all([
    admin
      .from('subscriptions')
      .select('user_id, status, is_partner, billing_term')
      .in('user_id', ids),
    loadReferralAttributionByReferredIds(admin, ids),
  ]);
  const subscriptions = subscriptionsRes.data;

  const COMBO_TERMS = new Set(['combo_3', 'combo_6', 'combo_12']);

  return profiles.map((profile) => {
    const userSubs = (subscriptions ?? []).filter(
      (sub) => sub.user_id === profile.id
    );
    const activeSubscriptions = userSubs.filter(
      (sub) => sub.status === 'active'
    ).length;
    const latestStatus =
      userSubs.find((sub) => sub.status === 'active')?.status ??
      userSubs[0]?.status ??
      null;
    const isPartner = userSubs.some(
      (sub) => sub.is_partner && sub.status === 'active'
    );
    const comboTerms = Array.from(
      new Set(
        userSubs
          .filter((sub) => sub.status === 'active')
          .map((sub) => sub.billing_term as string)
          .filter((term) => COMBO_TERMS.has(term))
      )
    ) as Array<'combo_3' | 'combo_6' | 'combo_12'>;

    return {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      display_name: profile.display_name,
      phone: profile.phone,
      cpf: profile.cpf,
      created_at: profile.created_at,
      activeSubscriptions,
      latestStatus,
      isPartner,
      comboTerms,
      referralAttribution: referralByUserId.get(profile.id) ?? null,
    };
  });
}

export async function listAdminPartnerSubscriptions(
  admin: SupabaseClient,
  filters: AdminListFilters = {}
): Promise<AdminPartnerRow[]> {
  const limit = filters.limit ?? 100;
  const { data, error } = await admin
    .from('subscriptions')
    .select(
      `
      id,
      user_id,
      status,
      current_cycle,
      started_at,
      profiles(full_name, display_name, email),
      plans!plan_id(name, slug)
    `
    )
    .eq('is_partner', true)
    .order('started_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error('[admin] listAdminPartnerSubscriptions:', error.message);
    return [];
  }

  const q = filters.q?.trim().toLowerCase();

  return (data ?? [])
    .map((row) => {
      const profileData = Array.isArray(row.profiles)
        ? row.profiles[0]
        : row.profiles;
      const planData = Array.isArray(row.plans) ? row.plans[0] : row.plans;

      return {
        id: row.id as string,
        user_id: row.user_id as string,
        status: row.status as AdminPartnerRow['status'],
        current_cycle: row.current_cycle as number | null,
        started_at: row.started_at as string | null,
        customerName:
          profileData?.full_name ?? profileData?.display_name ?? null,
        customerEmail: profileData?.email ?? null,
        planName: planData?.name ?? null,
        planSlug: planData?.slug ?? null,
      };
    })
    .filter((row) => {
      if (!q) return true;
      const haystack = [
        row.customerName,
        row.customerEmail,
        row.planName,
        row.planSlug,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
}

export async function getAdminCustomerDetail(
  admin: SupabaseClient,
  userId: string
): Promise<AdminCustomerDetail | null> {
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) return null;

  const [addressesRes, subscriptionsRes, paymentsRes] = await Promise.all([
    admin
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false }),
    admin
      .from('subscriptions')
      .select('*, plans!plan_id(*), pending_plan:plans!pending_plan_id(*), addresses(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    admin
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  const subscriptions = (subscriptionsRes.data ?? []) as Subscription[];
  const subIds = subscriptions.map((sub) => sub.id);

  const [cyclesRes, referralAttribution] = await Promise.all([
    subIds.length > 0
      ? admin
          .from('subscription_cycles')
          .select('*, themes(*)')
          .in('subscription_id', subIds)
          .order('cycle_number', { ascending: false })
      : Promise.resolve({ data: [] as SubscriptionCycle[] }),
    loadReferralAttributionByReferredIds(admin, [userId]).then(
      (map) => map.get(userId) ?? null
    ),
  ]);

  const cycles = (cyclesRes.data ?? []) as SubscriptionCycle[];

  const planChanges = await listAdminCustomerPlanChanges(admin, userId);

  return {
    profile: profile as AdminCustomerDetail['profile'],
    addresses: addressesRes.data ?? [],
    subscriptions,
    payments: (paymentsRes.data ?? []) as Payment[],
    cycles,
    referralAttribution,
    planChanges,
  };
}

export async function listAdminCustomerPlanChanges(
  admin: SupabaseClient,
  userId: string
): Promise<AdminCustomerPlanChange[]> {
  const { data, error } = await admin
    .from('subscription_plan_changes')
    .select(
      `
      id,
      subscription_id,
      event,
      actor,
      created_at,
      from_plan:plans!from_plan_id(name),
      to_plan:plans!to_plan_id(name)
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[admin] listAdminCustomerPlanChanges:', error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    subscription_id: row.subscription_id as string,
    event: row.event as AdminCustomerPlanChange['event'],
    actor: row.actor as AdminCustomerPlanChange['actor'],
    created_at: row.created_at as string,
    fromPlanName: relOne(row.from_plan as { name: string } | { name: string }[] | null)?.name ?? null,
    toPlanName: relOne(row.to_plan as { name: string } | { name: string }[] | null)?.name ?? null,
  }));
}

export async function listAdminSubscriptions(
  admin: SupabaseClient,
  filters: AdminListFilters = {}
): Promise<AdminPaginatedResult<AdminSubscriptionRow>> {
  const pagination = parseAdminListPagination(
    {
      page: filters.page != null ? String(filters.page) : undefined,
      pageSize: filters.pageSize != null ? String(filters.pageSize) : undefined,
      sort: filters.sort,
      order: filters.order,
    },
    {
      defaultSort: 'created_at',
      defaultOrder: 'desc',
      allowedSorts: [
        'created_at',
        'started_at',
        'next_billing_date',
        'cancelled_at',
        'current_cycle',
      ],
    }
  );

  const pageSize = pagination.pageSize;
  const rangeFrom = (pagination.page - 1) * pageSize;
  const rangeTo = rangeFrom + pageSize - 1;

  let query = admin
    .from('subscriptions')
    .select(
      `
      id,
      user_id,
      status,
      current_cycle,
      next_billing_date,
      started_at,
      created_at,
      asaas_subscription_id,
      asaas_customer_id,
      stripe_subscription_id,
      pagarme_subscription_id,
      promo_code,
      billing_term,
      combo_total_cents,
      combo_installments,
      prepaid_until,
      cancelled_at,
      cancel_reason,
      profiles(full_name, display_name, email),
      plans!plan_id(name, slug)
    `,
      { count: 'exact' }
    )
    .order(pagination.sort, {
      ascending: pagination.order === 'asc',
      nullsFirst: pagination.order === 'asc',
    })
    .range(rangeFrom, rangeTo);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.gateway === 'asaas') {
    query = query.not('asaas_subscription_id', 'is', null);
  } else if (filters.gateway === 'pagarme') {
    query = query.not('pagarme_subscription_id', 'is', null);
  } else if (filters.gateway === 'stripe') {
    query = query.not('stripe_subscription_id', 'is', null);
  } else if (filters.gateway === 'mp') {
    query = query.not('mp_subscription_id', 'is', null);
  }

  const q = filters.q?.trim();
  if (q) {
    query = query.or(
      `asaas_subscription_id.ilike.%${q}%,stripe_subscription_id.ilike.%${q}%,pagarme_subscription_id.ilike.%${q}%,promo_code.ilike.%${q}%`
    );
  }

  const { data, count, error } = await query;
  if (error) {
    console.error('[admin] listAdminSubscriptions:', error.message);
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const subscriptionIds = (data ?? []).map((row) => row.id as string);
  const planUpgradeBySubscription = await loadSubscriptionPlanUpgradeInfoByIds(
    admin,
    subscriptionIds
  );

  const items = (data ?? []).map((row) => {
    const profileData = Array.isArray(row.profiles)
      ? row.profiles[0]
      : row.profiles;
    const planData = Array.isArray(row.plans) ? row.plans[0] : row.plans;

    return {
      id: row.id as string,
      user_id: row.user_id as string,
      status: row.status as AdminSubscriptionRow['status'],
      current_cycle: row.current_cycle as number | null,
      next_billing_date: row.next_billing_date as string | null,
      started_at: row.started_at as string | null,
      asaas_subscription_id: row.asaas_subscription_id as string | null,
      asaas_customer_id: row.asaas_customer_id as string | null,
      stripe_subscription_id: row.stripe_subscription_id as string | null,
      pagarme_subscription_id: row.pagarme_subscription_id as string | null,
      promo_code: row.promo_code as string | null,
      customerName:
        profileData?.full_name ?? profileData?.display_name ?? null,
      customerEmail: profileData?.email ?? null,
      planName: planData?.name ?? null,
      planSlug: planData?.slug ?? null,
      billingTerm: (row.billing_term as string | null) ?? null,
      comboTotalCents: (row.combo_total_cents as number | null) ?? null,
      comboInstallments: (row.combo_installments as number | null) ?? null,
      prepaidUntil: (row.prepaid_until as string | null) ?? null,
      cancelled_at: (row.cancelled_at as string | null) ?? null,
      cancel_reason: (row.cancel_reason as string | null) ?? null,
      planUpgrade: planUpgradeBySubscription.get(row.id as string) ?? null,
    };
  });

  return {
    items,
    total,
    page: Math.min(pagination.page, totalPages),
    pageSize,
    totalPages,
  };
}

export async function getAdminSubscriptionDetail(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<Subscription | null> {
  const { data } = await admin
    .from('subscriptions')
    .select(
      `
      *,
      plans!plan_id(*),
      pending_plan:plans!pending_plan_id(*),
      addresses(*),
      profiles(full_name, display_name, email, phone, cpf),
      subscription_cycles(*, themes(*))
    `
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!data) return null;

  if (data.subscription_cycles) {
    data.subscription_cycles = (
      data.subscription_cycles as SubscriptionCycle[]
    ).sort((a, b) => b.cycle_number - a.cycle_number);
  }

  return data as Subscription;
}

export async function listAdminCycles(
  admin: SupabaseClient,
  filters: AdminListFilters & { cycleStatus?: string } = {}
): Promise<AdminCycleRow[]> {
  const limit = filters.limit ?? 50;
  let query = admin
    .from('subscription_cycles')
    .select(ADMIN_CYCLE_LIST_SELECT)
    .order('created_at', { ascending: false })
    .limit(limit);

  const status = filters.cycleStatus ?? filters.status ?? 'preparing';
  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[admin] listAdminCycles:', error.message);
    return [];
  }

  const rawRows = (data ?? []) as Record<string, unknown>[];
  const mapped = rawRows.map((row) => mapCycleRow(row));

  const subscriptionIds = Array.from(
    new Set(mapped.map((row) => row.subscription_id))
  );
  const siblingsBySub = await loadSiblingCyclesBySubscription(admin, subscriptionIds);

  return enrichCycleRowsWithShipmentItems(admin, mapped, rawRows, siblingsBySub);
}

export type ProductionKanbanBoard = Record<
  'upcoming' | 'production' | 'preparing' | 'shipped' | 'delivered',
  AdminCycleRow[]
>;

async function loadAdminProductionCycleRows(
  admin: SupabaseClient
): Promise<{
  mapped: AdminCycleRow[];
  rawRows: Record<string, unknown>[];
}> {
  // Delivered antigos incham o payload; cortamos em memória (sem .or() no PostgREST,
  // que quebrava o board ao falhar o filtro aninhado).
  const deliveredCutoff = new Date();
  deliveredCutoff.setMonth(deliveredCutoff.getMonth() - 4);
  const deliveredMonthFrom = monthKeyFromDate(deliveredCutoff);

  const { data, error } = await admin
    .from('subscription_cycles')
    .select(ADMIN_CYCLE_LIST_SELECT)
    .in('status', ['upcoming', 'production', 'preparing', 'shipped', 'delivered'])
    .order('scheduled_production_month', { ascending: true, nullsFirst: false })
    .order('paid_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[admin] loadAdminProductionCycleRows:', error.message);
    return { mapped: [], rawRows: [] };
  }

  const rawRows = ((data ?? []) as Record<string, unknown>[]).filter((row) => {
    if ((row.status as string) !== 'delivered') return true;

    const scheduledMonth = row.scheduled_production_month as string | null;
    if (scheduledMonth) return scheduledMonth >= deliveredMonthFrom;

    const anchor = (row.paid_at as string | null) ?? (row.created_at as string | null);
    if (!anchor) return true;
    return monthKeyFromDate(new Date(anchor)) >= deliveredMonthFrom;
  });

  return { mapped: rawRows.map((row) => mapCycleRow(row)), rawRows };
}

/** Ciclos operacionais enriquecidos (uma carga para calendário + kanban). */
export async function listAdminProductionEnrichedCycles(
  admin: SupabaseClient
): Promise<AdminCycleRow[]> {
  const { mapped, rawRows } = await loadAdminProductionCycleRows(admin);
  if (mapped.length === 0) return [];

  const subscriptionIds = Array.from(
    new Set(mapped.map((row) => row.subscription_id))
  );
  const siblingsBySub = await loadSiblingCyclesBySubscription(
    admin,
    subscriptionIds
  );

  return enrichCycleRowsWithShipmentItems(
    admin,
    mapped,
    rawRows,
    siblingsBySub
  );
}

export function buildProductionKanbanFromCycles(
  enriched: AdminCycleRow[],
  options?: {
    cycleNumber?: number;
    standaloneOrders?: Awaited<
      ReturnType<typeof listStandaloneStoreOrdersForProduction>
    >;
  }
): ProductionKanbanBoard {
  const empty: ProductionKanbanBoard = {
    upcoming: [],
    production: [],
    preparing: [],
    shipped: [],
    delivered: [],
  };

  if (enriched.length === 0) {
    if (options?.cycleNumber && options?.standaloneOrders?.length) {
      return integrateStandaloneStoreOrdersIntoCycleBoard(
        empty,
        options.standaloneOrders,
        options.cycleNumber
      );
    }
    return empty;
  }

  const metaBySubscriptionId = buildProductionSubscriptionMeta(enriched);

  const filtered =
    options?.cycleNumber != null
      ? filterProductionBoardRowsForCycle(
          enriched,
          options.cycleNumber,
          metaBySubscriptionId
        )
      : filterProductionBoardRows(enriched, metaBySubscriptionId);

  const board = groupProductionBoardRows(filtered);

  const finalBoard =
    options?.cycleNumber != null && options?.standaloneOrders
      ? integrateStandaloneStoreOrdersIntoCycleBoard(
          board,
          options.standaloneOrders,
          options.cycleNumber
        )
      : board;

  for (const status of Object.keys(finalBoard) as Array<keyof ProductionKanbanBoard>) {
    finalBoard[status].sort(compareCyclesByKitPaymentDate);
  }

  return finalBoard;
}

/** Todos os ciclos no mesmo quadro — visão macro, sem filtrar por ciclo. */
export function buildProductionOverviewBoard(
  enriched: AdminCycleRow[],
  options?: {
    standaloneOrders?: Awaited<
      ReturnType<typeof listStandaloneStoreOrdersForProduction>
    >;
  }
): ProductionKanbanBoard {
  const empty: ProductionKanbanBoard = {
    upcoming: [],
    production: [],
    preparing: [],
    shipped: [],
    delivered: [],
  };

  if (enriched.length === 0) {
    if (options?.standaloneOrders?.length) {
      return integrateStandaloneStoreOrdersIntoOverviewBoard(
        empty,
        options.standaloneOrders
      );
    }
    return empty;
  }

  const metaBySubscriptionId = buildProductionSubscriptionMeta(enriched);
  const cycleNumbers = Array.from(
    new Set(
      enriched
        .map((row) => row.cycle_number)
        .filter((n): n is number => n >= 1)
    )
  ).sort((a, b) => a - b);

  const seen = new Set<string>();
  const eligible: AdminCycleRow[] = [];
  for (const cycleNumber of cycleNumbers) {
    const rows = filterProductionBoardRowsForCycle(
      enriched,
      cycleNumber,
      metaBySubscriptionId
    );
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      eligible.push(row);
    }
  }

  const board = groupProductionBoardRows(eligible);
  const finalBoard = options?.standaloneOrders
    ? integrateStandaloneStoreOrdersIntoOverviewBoard(
        board,
        options.standaloneOrders
      )
    : board;

  for (const status of Object.keys(finalBoard) as Array<keyof ProductionKanbanBoard>) {
    finalBoard[status].sort(compareCyclesByKitPaymentDate);
  }

  return finalBoard;
}

export async function listAdminProductionKanban(
  admin: SupabaseClient,
  options?: { cycleNumber?: number }
): Promise<ProductionKanbanBoard> {
  const [enriched, standaloneOrders] = await Promise.all([
    listAdminProductionEnrichedCycles(admin),
    listStandaloneStoreOrdersForProduction(admin),
  ]);
  return buildProductionKanbanFromCycles(enriched, {
    ...options,
    standaloneOrders,
  });
}

/** Todos os ciclos operacionais para o navegador de ciclos. */
export async function listAdminProductionCalendarSource(
  admin: SupabaseClient
): Promise<AdminCycleRow[]> {
  return listAdminProductionEnrichedCycles(admin);
}

export type CycleStatusCounts = Record<
  | 'upcoming'
  | 'production'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'failed'
  | 'all',
  number
>;

export async function getAdminCycleStatusCounts(
  admin: SupabaseClient
): Promise<CycleStatusCounts> {
  const statuses = [
    'upcoming',
    'production',
    'preparing',
    'shipped',
    'delivered',
    'cancelled',
    'failed',
  ] as const;

  const results = await Promise.all(
    statuses.map(async (status) => {
      const { count } = await admin
        .from('subscription_cycles')
        .select('id', { count: 'exact', head: true })
        .eq('status', status);
      return [status, count ?? 0] as const;
    })
  );

  const { count: total } = await admin
    .from('subscription_cycles')
    .select('id', { count: 'exact', head: true });

  return {
    ...Object.fromEntries(results),
    all: total ?? 0,
  } as CycleStatusCounts;
}

export async function getAdminCycleDetail(
  admin: SupabaseClient,
  cycleId: string
): Promise<SubscriptionCycle | null> {
  const { data } = await admin
    .from('subscription_cycles')
    .select(
      `
      *,
      themes(*),
      subscriptions(
        *,
        plans!plan_id(*),
        addresses(*),
        profiles(full_name, display_name, email, phone, cpf)
      )
    `
    )
    .eq('id', cycleId)
    .maybeSingle();

  return (data as SubscriptionCycle | null) ?? null;
}

export async function listAdminPayments(
  admin: SupabaseClient,
  filters: AdminListFilters = {}
): Promise<AdminPaymentRow[]> {
  const limit = filters.limit ?? 50;
  let query = admin
    .from('payments')
    .select(
      `
      *,
      profiles(full_name, display_name, email),
      subscriptions(
        billing_term,
        combo_total_cents,
        combo_installments,
        plans!plan_id(name)
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data } = await query;

  return (data ?? []).map((row) => mapPaymentRow(row as Record<string, unknown>));
}

export async function listAdminPlans(
  admin: SupabaseClient
): Promise<AdminPlanRow[]> {
  const { data } = await admin
    .from('plans')
    .select('*')
    .order('sort_order', { ascending: true });

  return (data ?? []) as AdminPlanRow[];
}

export async function getAdminPlan(
  admin: SupabaseClient,
  planId: string
): Promise<AdminPlanRow | null> {
  const { data } = await admin
    .from('plans')
    .select('*')
    .eq('id', planId)
    .maybeSingle();

  return (data as AdminPlanRow | null) ?? null;
}

export async function listAdminThemes(
  admin: SupabaseClient,
  filters: AdminListFilters = {}
): Promise<Theme[]> {
  const limit = filters.limit ?? 100;
  let query = admin
    .from('themes')
    .select('*')
    .order('year', { ascending: false })
    .order('month_number', { ascending: false })
    .limit(limit);

  const q = filters.q?.trim();
  if (q) {
    query = query.or(`name.ilike.%${q}%,slug.ilike.%${q}%`);
  }

  const { data } = await query;
  return (data ?? []) as Theme[];
}

export async function getAdminTheme(
  admin: SupabaseClient,
  themeId: string
): Promise<Theme | null> {
  const { data } = await admin
    .from('themes')
    .select('*')
    .eq('id', themeId)
    .maybeSingle();

  return (data as Theme | null) ?? null;
}

export async function listAdminPromoCodes(
  admin: SupabaseClient,
  filters: AdminListFilters = {}
): Promise<AdminPromoCodeRow[]> {
  const limit = filters.limit ?? 100;
  let query = admin
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  const q = filters.q?.trim();
  if (q) {
    query = query.ilike('code', `%${q}%`);
  }

  if (filters.status === 'active') {
    query = query.eq('active', true);
  } else if (filters.status === 'inactive') {
    query = query.eq('active', false);
  }

  const { data } = await query;
  return (data ?? []) as AdminPromoCodeRow[];
}

export async function getAdminPromoCode(
  admin: SupabaseClient,
  promoId: string
): Promise<AdminPromoCodeRow | null> {
  const { data } = await admin
    .from('promo_codes')
    .select('*')
    .eq('id', promoId)
    .maybeSingle();

  return (data as AdminPromoCodeRow | null) ?? null;
}

export async function listPromoRedemptions(
  admin: SupabaseClient,
  promoId: string
): Promise<AdminPromoRedemptionRow[]> {
  const { data } = await admin
    .from('promo_code_redemptions')
    .select(
      `
      id,
      user_id,
      subscription_id,
      created_at,
      profiles(full_name, display_name, email)
    `
    )
    .eq('promo_code_id', promoId)
    .order('created_at', { ascending: false });

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id as string,
      user_id: row.user_id as string,
      subscription_id: row.subscription_id as string | null,
      created_at: row.created_at as string,
      customerName: profile?.full_name ?? profile?.display_name ?? null,
      customerEmail: profile?.email ?? null,
    };
  });
}

export async function listAdminAuditLog(
  admin: SupabaseClient,
  limit = 100
): Promise<AdminAuditRow[]> {
  const { data } = await admin
    .from('admin_audit_log')
    .select(
      `
      id,
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata,
      ip_address,
      created_at,
      profiles(full_name, display_name, email)
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id as string,
      actor_id: row.actor_id as string | null,
      action: row.action as string,
      entity_type: row.entity_type as string,
      entity_id: row.entity_id as string | null,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      ip_address: row.ip_address as string | null,
      created_at: row.created_at as string,
      actorName: profile?.full_name ?? profile?.display_name ?? null,
      actorEmail: profile?.email ?? null,
    };
  });
}
