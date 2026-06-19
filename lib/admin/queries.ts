import type { SupabaseClient } from '@supabase/supabase-js';
import { relOne } from '@/lib/dashboard/format';
import type { Payment, Plan, Subscription, SubscriptionCycle, Theme } from '@/lib/dashboard/types';
import type {
  AdminCustomerDetail,
  AdminCustomerRow,
  AdminCycleRow,
  AdminDashboardStats,
  AdminListFilters,
  AdminPaymentRow,
  AdminPlanRow,
  AdminPromoCodeRow,
  AdminAuditRow,
  AdminPromoRedemptionRow,
  AdminSubscriptionRow,
} from './types';

function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

const ADMIN_CYCLE_LIST_SELECT = `
  id,
  subscription_id,
  cycle_number,
  status,
  tracking_code,
  carrier,
  shipped_at,
  created_at,
  themes(name),
  subscriptions(
    profiles(full_name, display_name, email),
    plans!plan_id(name),
    addresses(city, state)
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

  return {
    id: row.id as string,
    subscription_id: row.subscription_id as string,
    cycle_number: row.cycle_number as number,
    status: row.status as AdminCycleRow['status'],
    tracking_code: (row.tracking_code as string | null) ?? null,
    carrier: (row.carrier as string | null) ?? null,
    shipped_at: (row.shipped_at as string | null) ?? null,
    customerName:
      (profile?.full_name as string | null) ??
      (profile?.display_name as string | null) ??
      null,
    customerEmail: (profile?.email as string | null) ?? null,
    planName: (plan?.name as string | null) ?? null,
    themeName: (theme?.name as string | null) ?? null,
    city: (address?.city as string | null) ?? null,
    state: (address?.state as string | null) ?? null,
  };
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
      .eq('status', 'preparing'),
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
      .select('amount_cents')
      .eq('status', 'approved')
      .gte('paid_at', since30d),
    admin
      .from('payments')
      .select('*')
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
  ]);

  const mrrRows = mrrRes.data ?? [];
  const mrrByPlan = mrrRows.map((row) => ({
    planName: row.name as string,
    subscribers: Number(row.subscribers ?? 0),
    mrrCents: Math.round(Number(row.mrr_brl ?? 0) * 100),
  }));
  const mrrCents = mrrByPlan.reduce((sum, row) => sum + row.mrrCents, 0);

  const approvedPayments = payments30Res.data ?? [];
  const revenueApproved30dCents = approvedPayments.reduce(
    (sum, row) => sum + (row.amount_cents ?? 0),
    0
  );

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
    mrrByPlan,
    recentPayments: (recentPaymentsRes.data ?? []) as Payment[],
    shipQueue: (shipQueueRes.data ?? []).map((row) =>
      mapCycleRow(row as Record<string, unknown>)
    ),
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
  const { data: subscriptions } = await admin
    .from('subscriptions')
    .select('user_id, status')
    .in('user_id', ids);

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
    };
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
      .select('*, plans!plan_id(*), addresses(*)')
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

  let cycles: SubscriptionCycle[] = [];
  if (subIds.length > 0) {
    const { data } = await admin
      .from('subscription_cycles')
      .select('*, themes(*)')
      .in('subscription_id', subIds)
      .order('cycle_number', { ascending: false });
    cycles = (data ?? []) as SubscriptionCycle[];
  }

  return {
    profile: profile as AdminCustomerDetail['profile'],
    addresses: addressesRes.data ?? [],
    subscriptions,
    payments: (paymentsRes.data ?? []) as Payment[],
    cycles,
  };
}

export async function listAdminSubscriptions(
  admin: SupabaseClient,
  filters: AdminListFilters = {}
): Promise<AdminSubscriptionRow[]> {
  const limit = filters.limit ?? 50;
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
      asaas_subscription_id,
      stripe_subscription_id,
      promo_code,
      profiles(full_name, display_name, email),
      plans!plan_id(name, slug)
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const q = filters.q?.trim();
  if (q) {
    query = query.or(
      `asaas_subscription_id.ilike.%${q}%,stripe_subscription_id.ilike.%${q}%,promo_code.ilike.%${q}%`
    );
  }

  const { data } = await query;

  return (data ?? []).map((row) => {
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
      stripe_subscription_id: row.stripe_subscription_id as string | null,
      promo_code: row.promo_code as string | null,
      customerName:
        profileData?.full_name ?? profileData?.display_name ?? null,
      customerEmail: profileData?.email ?? null,
      planName: planData?.name ?? null,
      planSlug: planData?.slug ?? null,
    };
  });
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

  return (data ?? []).map((row) =>
    mapCycleRow(row as Record<string, unknown>)
  );
}

export type ProductionKanbanBoard = Record<
  'upcoming' | 'preparing' | 'shipped' | 'delivered',
  AdminCycleRow[]
>;

export async function listAdminProductionKanban(
  admin: SupabaseClient
): Promise<ProductionKanbanBoard> {
  const empty: ProductionKanbanBoard = {
    upcoming: [],
    preparing: [],
    shipped: [],
    delivered: [],
  };

  const { data, error } = await admin
    .from('subscription_cycles')
    .select(ADMIN_CYCLE_LIST_SELECT)
    .in('status', ['upcoming', 'preparing', 'shipped', 'delivered'])
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[admin] listAdminProductionKanban:', error.message);
    return empty;
  }

  for (const row of data ?? []) {
    const mapped = mapCycleRow(row as Record<string, unknown>);
    if (mapped.status in empty) {
      empty[mapped.status as keyof ProductionKanbanBoard].push(mapped);
    }
  }

  return empty;
}

export type CycleStatusCounts = Record<
  'upcoming' | 'preparing' | 'shipped' | 'delivered' | 'cancelled' | 'failed' | 'all',
  number
>;

export async function getAdminCycleStatusCounts(
  admin: SupabaseClient
): Promise<CycleStatusCounts> {
  const statuses = [
    'upcoming',
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
        profiles(full_name, display_name, email, phone)
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
      subscriptions(plans!plan_id(name))
    `
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data } = await query;

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const subscription = Array.isArray(row.subscriptions)
      ? row.subscriptions[0]
      : row.subscriptions;
    const plan = subscription?.plans
      ? Array.isArray(subscription.plans)
        ? subscription.plans[0]
        : subscription.plans
      : null;

    const { profiles: _p, subscriptions: _s, ...payment } = row;

    return {
      ...(payment as Payment),
      customerName: profile?.full_name ?? profile?.display_name ?? null,
      customerEmail: profile?.email ?? null,
      planName: plan?.name ?? null,
    };
  });
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
