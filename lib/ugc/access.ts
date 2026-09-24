import type { SupabaseClient } from '@supabase/supabase-js';
import { userHasActiveSubscription } from '@/lib/theme-votes/queries';

export function userCanAccessUgcCampaign(
  isAdmin: boolean,
  isActiveSubscriber: boolean
): boolean {
  return isAdmin || isActiveSubscriber;
}

export async function userCanSubmitUgc(
  client: SupabaseClient,
  userId: string
): Promise<boolean> {
  const [{ data }, isActive] = await Promise.all([
    client.from('profiles').select('is_admin').eq('id', userId).maybeSingle(),
    userHasActiveSubscription(client, userId),
  ]);

  return userCanAccessUgcCampaign(data?.is_admin === true, isActive);
}
