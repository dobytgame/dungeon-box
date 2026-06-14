import type { SupabaseClient } from '@supabase/supabase-js';
import { greetingName } from '@/lib/email/layout';

export interface UserEmailProfile {
  email: string;
  name: string;
}

async function resolveNotificationEmail(
  supabase: SupabaseClient,
  userId: string,
  profileEmail?: string | null
): Promise<string | null> {
  const fromProfile = profileEmail?.trim().toLowerCase();
  if (fromProfile) return fromProfile;

  try {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error) {
      console.warn(
        '[email] auth.admin.getUserById failed:',
        userId,
        error.message
      );
      return null;
    }

    const authEmail = data.user?.email?.trim().toLowerCase();
    if (!authEmail) {
      console.warn('[email] usuário sem e-mail no auth:', userId);
      return null;
    }

    await supabase
      .from('profiles')
      .update({
        email: authEmail,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    return authEmail;
  } catch (err) {
    console.warn('[email] não foi possível resolver e-mail do auth:', userId, err);
    return null;
  }
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

  const email = await resolveNotificationEmail(
    supabase,
    userId,
    data?.email
  );
  if (!email) return null;

  return {
    email,
    name: greetingName(data?.display_name ?? data?.full_name),
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

  if (!data) {
    console.warn('[email] assinatura não encontrada:', subscriptionId);
    return null;
  }

  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  const plan = Array.isArray(data.plans) ? data.plans[0] : data.plans;

  const email = await resolveNotificationEmail(
    supabase,
    data.user_id,
    profile?.email
  );

  if (!email || !plan?.name) {
    console.warn('[email] contexto incompleto para assinatura:', subscriptionId, {
      hasEmail: Boolean(email),
      hasPlan: Boolean(plan?.name),
      userId: data.user_id,
    });
    return null;
  }

  return {
    subscriptionId: data.id,
    userId: data.user_id,
    email,
    name: greetingName(profile?.display_name ?? profile?.full_name),
    planName: plan.name,
    currentCycle: data.current_cycle ?? 1,
    status: data.status,
  };
}
