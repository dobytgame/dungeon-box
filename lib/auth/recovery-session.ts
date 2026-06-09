import type { SupabaseClient } from '@supabase/supabase-js';

export const PASSWORD_RESET_PATH = '/auth/nova-senha';

/** Parâmetros de recuperação no hash (#access_token=…&type=recovery). */
export function getRecoveryHashParams(): URLSearchParams | null {
  if (typeof window === 'undefined') return null;

  const hash = window.location.hash.slice(1);
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  return params.get('type') === 'recovery' ? params : null;
}

/** Parâmetros de recuperação na query (?token_hash=…&type=recovery). */
export function getRecoverySearchParams(): URLSearchParams | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  if (params.get('type') !== 'recovery' || !params.get('token_hash')) {
    return null;
  }

  return params;
}

export function hasRecoveryCallbackInUrl(): boolean {
  return Boolean(getRecoveryHashParams() || getRecoverySearchParams());
}

/**
 * Converte hash/query de recuperação em sessão Supabase.
 * Retorna ready | invalid | none (nenhum token na URL).
 */
export async function establishRecoverySession(
  supabase: SupabaseClient,
): Promise<'ready' | 'invalid' | 'none'> {
  const searchParams = getRecoverySearchParams();
  if (searchParams) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: searchParams.get('token_hash')!,
      type: 'recovery',
    });
    window.history.replaceState(null, '', PASSWORD_RESET_PATH);
    return error ? 'invalid' : 'ready';
  }

  const hashParams = getRecoveryHashParams();
  if (hashParams) {
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (!accessToken || !refreshToken) {
      return 'invalid';
    }

    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    window.history.replaceState(null, '', PASSWORD_RESET_PATH);
    return error ? 'invalid' : 'ready';
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session ? 'ready' : 'none';
}
