import type { SupabaseClient } from '@supabase/supabase-js';

/** Apenas assinatura com status `active` tem acesso ao programa. */
export async function userHasActiveReferralAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { count } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active');

  return (count ?? 0) > 0;
}

export async function getActiveSubscriptionId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.id ?? null;
}
