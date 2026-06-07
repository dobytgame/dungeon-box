import { redirect } from 'next/navigation';
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

export async function getLatestSubscription(
  userId: string
): Promise<Subscription | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select(
      `
      *,
      plans(*),
      addresses(*)
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getSubscriptionWithCycles(
  userId: string
): Promise<Subscription | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select(
      `
      *,
      plans(*),
      addresses(*),
      subscription_cycles(
        *,
        themes(*)
      )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.subscription_cycles) {
    data.subscription_cycles = (
      data.subscription_cycles as SubscriptionCycle[]
    ).sort((a, b) => b.cycle_number - a.cycle_number);
  }

  return data;
}

export async function getAllSubscriptions(userId: string): Promise<Subscription[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select(`*, plans(*), addresses(*)`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return data ?? [];
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
