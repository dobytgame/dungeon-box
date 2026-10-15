import type { SupabaseClient } from '@supabase/supabase-js';
import { isComboTerm, type BillingTerm } from '@/lib/checkout/combo-billing';
import { isOnOrAfterPrepaidEndDay } from '@/lib/payments/prepaid-renewal';

/** Zera fidelidade quando o pacote combo termina sem renovação automática. */
export async function resetComboLoyaltyAfterPackageEnd(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<void> {
  const { data } = await supabase
    .from('subscriptions')
    .select('billing_term, prepaid_until, combo_auto_renew, loyalty_level')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!data) return;
  const term = (data.billing_term as BillingTerm | null) ?? 'monthly';
  if (!isComboTerm(term)) return;
  if (data.combo_auto_renew !== false) return;
  if ((data.loyalty_level ?? 1) <= 1) return;

  if (
    !isOnOrAfterPrepaidEndDay(
      data.prepaid_until as string | null,
      new Date().toISOString()
    )
  ) {
    return;
  }

  await supabase
    .from('subscriptions')
    .update({
      loyalty_level: 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId);
}

export async function runComboLoyaltyExpirySweep(
  supabase: SupabaseClient
): Promise<{ updated: number }> {
  const { data: rows } = await supabase
    .from('subscriptions')
    .select('id, billing_term, prepaid_until, combo_auto_renew, loyalty_level')
    .eq('combo_auto_renew', false)
    .gt('loyalty_level', 1);

  let updated = 0;
  const nowIso = new Date().toISOString();

  for (const row of rows ?? []) {
    const term = (row.billing_term as BillingTerm | null) ?? 'monthly';
    if (!isComboTerm(term)) continue;
    if (
      !isOnOrAfterPrepaidEndDay(
        row.prepaid_until as string | null,
        nowIso
      )
    ) {
      continue;
    }

    const { error } = await supabase
      .from('subscriptions')
      .update({
        loyalty_level: 1,
        updated_at: nowIso,
      })
      .eq('id', row.id as string);

    if (!error) updated += 1;
  }

  return { updated };
}
