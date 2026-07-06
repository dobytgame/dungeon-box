import type { SupabaseClient } from '@supabase/supabase-js';

/** Quando false (padrão), apenas admins acessam a vitrine e APIs da loja. */
export function isStorePublic(): boolean {
  return process.env.STORE_PUBLIC === 'true';
}

export async function profileIsStoreAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  return profile?.is_admin === true;
}

export async function userCanAccessStore(
  supabase: SupabaseClient,
  userId: string | null | undefined
): Promise<boolean> {
  if (isStorePublic()) return true;
  if (!userId) return false;
  return profileIsStoreAdmin(supabase, userId);
}

export type StoreAccessDenied = { allowed: false; status: 401 | 403 };
export type StoreAccessGranted = { allowed: true };

export async function assertStoreAccessForApi(
  supabase: SupabaseClient,
  userId: string | null | undefined
): Promise<StoreAccessGranted | StoreAccessDenied> {
  if (isStorePublic()) return { allowed: true };
  if (!userId) return { allowed: false, status: 401 };
  const isAdmin = await profileIsStoreAdmin(supabase, userId);
  if (!isAdmin) return { allowed: false, status: 403 };
  return { allowed: true };
}
