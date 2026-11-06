import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Valor da renovação automática do combo. Campanhas gravam `combo_renewal_cents`
 * quando o 1º pacote teve preço promocional; sem ele vale `combo_total_cents`.
 */
export async function resolveComboRenewalCents(
  supabase: SupabaseClient,
  subscriptionId: string,
  fallbackCents: number
): Promise<number> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('combo_renewal_cents')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (error) return fallbackCents;
  const renewal = (data as { combo_renewal_cents?: number | null } | null)?.combo_renewal_cents;
  return renewal != null && renewal > 0 ? renewal : fallbackCents;
}
