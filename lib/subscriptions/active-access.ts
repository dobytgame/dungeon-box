import type { SupabaseClient } from '@supabase/supabase-js';

/** Assinatura com status `active`. */
export async function userHasActiveSubscriptionAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error) {
    console.error('[subscriptions] userHasActiveSubscriptionAccess:', error.message);
    return false;
  }

  return (count ?? 0) > 0;
}
