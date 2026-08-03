import type { SupabaseClient } from '@supabase/supabase-js';

export type BillingDayGateway = 'pagarme' | 'asaas' | 'stripe' | 'mp' | 'none';

export type AdminBillingDaySubscription = {
  id: string;
  userId: string;
  status: string;
  billingTerm: string | null;
  nextBillingDate: string | null;
  gateway: BillingDayGateway;
  needsMigration: boolean;
  updateRequestedAt: string | null;
  migratedAt: string | null;
  planName: string;
  planSlug: string | null;
  customerName: string | null;
  customerEmail: string | null;
  lastMigrationEmailAt: string | null;
};

function resolveGateway(row: {
  pagarme_subscription_id?: string | null;
  asaas_subscription_id?: string | null;
  stripe_subscription_id?: string | null;
  mp_subscription_id?: string | null;
}): BillingDayGateway {
  if (row.pagarme_subscription_id) return 'pagarme';
  if (row.asaas_subscription_id) return 'asaas';
  if (row.stripe_subscription_id) return 'stripe';
  if (row.mp_subscription_id) return 'mp';
  return 'none';
}

function dayBounds(dateYmd: string): { start: string; end: string } {
  // Interpreta a data no fuso local do servidor (UTC no Vercel) como dia civil YYYY-MM-DD.
  const start = `${dateYmd}T00:00:00.000Z`;
  const end = `${dateYmd}T23:59:59.999Z`;
  return { start, end };
}

export function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function listBillingDaySubscriptions(
  admin: SupabaseClient,
  input: {
    dateYmd: string;
    gateway?: BillingDayGateway | 'all';
    status?: string;
  }
): Promise<AdminBillingDaySubscription[]> {
  const { start, end } = dayBounds(input.dateYmd);
  const gatewayFilter = input.gateway ?? 'all';
  const statusFilter = input.status ?? 'active';

  let query = admin
    .from('subscriptions')
    .select(
      `
      id,
      user_id,
      status,
      billing_term,
      next_billing_date,
      update_requested_at,
      migrated_to_pagarme_at,
      asaas_subscription_id,
      pagarme_subscription_id,
      stripe_subscription_id,
      mp_subscription_id,
      plans!plan_id(name, slug),
      profiles!inner(email, full_name)
    `
    )
    .gte('next_billing_date', start)
    .lte('next_billing_date', end)
    .order('next_billing_date', { ascending: true });

  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[admin] listBillingDaySubscriptions:', error.message);
    return [];
  }

  const rows = (data ?? []).map((row) => {
    const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const gateway = resolveGateway(row);
    const needsMigration =
      Boolean(row.asaas_subscription_id) &&
      !row.pagarme_subscription_id &&
      !row.migrated_to_pagarme_at &&
      (row.status === 'active' ||
        row.status === 'past_due' ||
        row.status === 'paused');

    return {
      id: row.id as string,
      userId: row.user_id as string,
      status: row.status as string,
      billingTerm: (row.billing_term as string | null) ?? null,
      nextBillingDate: (row.next_billing_date as string | null) ?? null,
      gateway,
      needsMigration,
      updateRequestedAt: (row.update_requested_at as string | null) ?? null,
      migratedAt: (row.migrated_to_pagarme_at as string | null) ?? null,
      planName: plan?.name ?? 'Plano',
      planSlug: plan?.slug ?? null,
      customerName: profile?.full_name ?? null,
      customerEmail: profile?.email ?? null,
      lastMigrationEmailAt: null as string | null,
    } satisfies AdminBillingDaySubscription;
  });

  const filtered =
    gatewayFilter === 'all'
      ? rows
      : rows.filter((row) => row.gateway === gatewayFilter);

  const migrationEligibleIds = filtered
    .filter((row) => row.needsMigration)
    .map((row) => row.id);

  if (migrationEligibleIds.length > 0) {
    const { data: logs } = await admin
      .from('gateway_migration_log')
      .select('subscription_id, email_sent_at')
      .in('subscription_id', migrationEligibleIds)
      .not('email_sent_at', 'is', null)
      .order('email_sent_at', { ascending: false });

    const latestBySub = new Map<string, string>();
    for (const log of logs ?? []) {
      const subId = log.subscription_id as string;
      if (!latestBySub.has(subId) && log.email_sent_at) {
        latestBySub.set(subId, log.email_sent_at as string);
      }
    }

    for (const row of filtered) {
      row.lastMigrationEmailAt = latestBySub.get(row.id) ?? null;
    }
  }

  return filtered;
}
