import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Votação pública para assinantes ativos.
 * Enquanto false, só admins acessam `/dashboard/votacao` para testes.
 */
export const THEME_VOTE_PUBLIC = true;

export function userCanSeeThemeVote(isAdmin: boolean): boolean {
  return THEME_VOTE_PUBLIC || isAdmin;
}

export function userCanCastThemeVote(
  isAdmin: boolean,
  isActiveSubscriber: boolean
): boolean {
  if (!userCanSeeThemeVote(isAdmin)) return false;
  if (THEME_VOTE_PUBLIC) return isActiveSubscriber;
  return isAdmin;
}

export async function profileIsAdmin(
  client: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await client
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();

  return data?.is_admin === true;
}
