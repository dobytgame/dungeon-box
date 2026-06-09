import type { SupabaseClient } from '@supabase/supabase-js';
import { greetingName } from '@/lib/email/layout';

export interface UserEmailProfile {
  email: string;
  name: string;
}

export async function getUserEmailProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<UserEmailProfile | null> {
  const { data } = await supabase
    .from('profiles')
    .select('email, full_name, display_name')
    .eq('id', userId)
    .maybeSingle();

  if (!data?.email) return null;

  return {
    email: data.email,
    name: greetingName(data.display_name ?? data.full_name),
  };
}

export interface SubscriptionEmailContext {
  subscriptionId: string;
  userId: string;
  email: string;
  name: string;
  planName: string;
  currentCycle: number;
  status: string;
}

export async function getSubscriptionEmailContext(
  supabase: SupabaseClient,
  subscriptionId: string,
): Promise<SubscriptionEmailContext | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select(
      `
      id,
      user_id,
      status,
      current_cycle,
      profiles (
        email,
        full_name,
        display_name
      ),
      plans (
        name
      )
    `,
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!data) return null;

  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  const plan = Array.isArray(data.plans) ? data.plans[0] : data.plans;

  if (!profile?.email || !plan?.name) return null;

  return {
    subscriptionId: data.id,
    userId: data.user_id,
    email: profile.email,
    name: greetingName(profile.display_name ?? profile.full_name),
    planName: plan.name,
    currentCycle: data.current_cycle ?? 1,
    status: data.status,
  };
}
