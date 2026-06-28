import type { SupabaseClient } from '@supabase/supabase-js';
import { parseComboPaymentDetail } from '@/lib/payments/effective-amount';

/** Corrige pagamentos de combo gravados com valor da 1ª parcela do Asaas. */
export async function repairComboPaymentAmounts(
  admin: SupabaseClient
): Promise<{ scanned: number; updated: number }> {
  const { data: payments, error } = await admin
    .from('payments')
    .select(
      `
      id,
      amount_cents,
      status_detail,
      installments,
      subscriptions(combo_total_cents, combo_installments, billing_term)
    `
    )
    .ilike('status_detail', '%combo_prepaid%');

  if (error) {
    console.error('[payments] repairComboPaymentAmounts:', error.message);
    return { scanned: 0, updated: 0 };
  }

  let updated = 0;

  for (const payment of payments ?? []) {
    const comboDetail = parseComboPaymentDetail(payment.status_detail as string);
    if (!comboDetail) continue;

    const subscription = Array.isArray(payment.subscriptions)
      ? payment.subscriptions[0]
      : payment.subscriptions;
    const comboTotal = subscription?.combo_total_cents as number | null | undefined;
    if (!comboTotal || comboTotal <= (payment.amount_cents as number)) continue;

    const installments =
      (subscription?.combo_installments as number | null | undefined) ??
      (payment.installments as number | null) ??
      1;

    const { error: updateError } = await admin
      .from('payments')
      .update({
        amount_cents: comboTotal,
        installments,
        status_detail: JSON.stringify({
          ...comboDetail,
          combo_total_cents: comboTotal,
          combo_installments: installments > 1 ? installments : undefined,
        }),
      })
      .eq('id', payment.id as string);

    if (!updateError) updated += 1;
  }

  return { scanned: payments?.length ?? 0, updated };
}
