import { redirect } from 'next/navigation';
import {
  reconcilePendingSubscriptions,
} from '@/lib/subscriptions/reconcile-pending';
import type { PlanSlug } from '@/lib/checkout/plans';
import { BLOCKING_SUBSCRIPTION_STATUSES } from '@/lib/subscriptions/blocking-statuses';
import { createClient } from '@/lib/supabase/server';
import type {
  Address,
  LoyaltyLevel,
  Payment,
  Profile,
  Subscription,
  SubscriptionCycle,
} from './types';

export async function requireDashboardUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth?next=/dashboard');
  }

  return { supabase, user };
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data;
}

export function displayName(profile: Profile | null, email?: string | null): string {
  return (
    profile?.display_name ||
    profile?.full_name ||
    email?.split('@')[0] ||
    'Aventureiro'
  );
}

const SUBSCRIPTION_STATUS_PRIORITY = [
  'active',
  'past_due',
  'paused',
  'pending',
] as const;

/** Assinatura principal para exibir no dashboard (não a tentativa cancelada mais recente). */
export function pickPrimarySubscription(
  subscriptions: Subscription[]
): Subscription | null {
  if (subscriptions.length === 0) return null;

  for (const status of SUBSCRIPTION_STATUS_PRIORITY) {
    const match = subscriptions.find((sub) => sub.status === status);
    if (match) return match;
  }

  return subscriptions[0] ?? null;
}

export async function getLatestSubscription(
  userId: string
): Promise<Subscription | null> {
  const subscriptions = await getAllSubscriptions(userId);
  return pickPrimarySubscription(subscriptions);
}

export async function getSubscriptionWithCycles(
  userId: string
): Promise<Subscription | null> {
  const primary = pickPrimarySubscription(await getAllSubscriptions(userId));
  if (!primary) return null;

  const supabase = createClient();
  const { data: cycles, error } = await supabase
    .from('subscription_cycles')
    .select(`*, themes(*)`)
    .eq('subscription_id', primary.id)
    .order('cycle_number', { ascending: false });

  if (error) {
    console.error('[dashboard] getSubscriptionWithCycles:', error.message);
  }

  return {
    ...primary,
    subscription_cycles: (cycles ?? []) as SubscriptionCycle[],
  };
}

const SUBSCRIPTION_SELECT =
  '*, plans!plan_id(*), addresses(*), pending_plan:plans!pending_plan_id(*)';

const SUBSCRIPTION_SELECT_FALLBACK = '*, plans!plan_id(*), addresses(*)';

async function fetchUserSubscriptions(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Subscription[]> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(SUBSCRIPTION_SELECT)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!error) {
    return data ?? [];
  }

  console.error('[dashboard] getAllSubscriptions:', error.message);

  const { data: fallback, error: fallbackError } = await supabase
    .from('subscriptions')
    .select(SUBSCRIPTION_SELECT_FALLBACK)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (fallbackError) {
    console.error('[dashboard] getAllSubscriptions fallback:', fallbackError.message);
    return [];
  }

  return fallback ?? [];
}

export async function getAllSubscriptions(userId: string): Promise<Subscription[]> {
  const supabase = createClient();
  const subscriptions = await fetchUserSubscriptions(supabase, userId);
  const pending = subscriptions.filter((sub) => sub.status === 'pending');

  if (pending.length > 0) {
    try {
      await reconcilePendingSubscriptions(pending);
    } catch (error) {
      console.error('[dashboard] reconcilePendingSubscriptions failed:', error);
    }

    return fetchUserSubscriptions(supabase, userId);
  }

  return subscriptions;
}

export async function getManageableSubscriptions(
  userId: string
): Promise<Subscription[]> {
  const subscriptions = await getAllSubscriptions(userId);
  return subscriptions.filter((sub) =>
    (BLOCKING_SUBSCRIPTION_STATUSES as readonly string[]).includes(sub.status)
  );
}

export async function getActivePlanSlugs(userId: string): Promise<PlanSlug[]> {
  const subscriptions = await getManageableSubscriptions(userId);
  const slugs = subscriptions
    .map((sub) => {
      const plan = Array.isArray(sub.plans) ? sub.plans[0] : sub.plans;
      return plan?.slug;
    })
    .filter((slug): slug is PlanSlug => Boolean(slug));

  return Array.from(new Set(slugs));
}

export async function getCycles(userId: string): Promise<SubscriptionCycle[]> {
  const supabase = createClient();
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId);

  if (!subs?.length) return [];

  const ids = subs.map((s) => s.id);
  const { data } = await supabase
    .from('subscription_cycles')
    .select(`*, themes(*)`)
    .in('subscription_id', ids)
    .order('cycle_number', { ascending: false });

  return (data ?? []) as SubscriptionCycle[];
}

export async function getPayments(userId: string): Promise<Payment[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getAddresses(userId: string): Promise<Address[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function getLoyaltyLevels(): Promise<LoyaltyLevel[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('loyalty_levels')
    .select('*')
    .order('level', { ascending: true });
  return data ?? [];
}

export async function getLoyaltyLevel(
  level: number
): Promise<LoyaltyLevel | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('loyalty_levels')
    .select('*')
    .eq('level', level)
    .maybeSingle();
  return data;
}
