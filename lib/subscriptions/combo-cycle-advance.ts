import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isComboTerm,
  prepaidMonthsForTerm,
  type BillingTerm,
} from '@/lib/checkout/combo-billing';
import { isComboPrepaidPayment } from '@/lib/payments/effective-amount';

/**
 * Após enviar um ciclo de combo pré-pago, avança o contador da assinatura.
 * Os ciclos dos meses seguintes já foram criados no checkout.
 */
export async function advancePrepaidComboCycleAfterShip(
  supabase: SupabaseClient,
  input: {
    subscriptionId: string;
    shippedCycleNumber: number;
    paymentLink: { id: string };
  }
): Promise<void> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('billing_term, prepaid_until')
    .eq('id', input.subscriptionId)
    .maybeSingle();

  if (!subscription) return;

  const billingTerm = (subscription.billing_term as BillingTerm | null) ?? 'monthly';
  if (!isComboTerm(billingTerm)) return;

  const prepaidUntilRaw = subscription.prepaid_until as string | null;
  if (!prepaidUntilRaw || new Date(prepaidUntilRaw) <= new Date()) return;

  const { data: paymentRow } = await supabase
    .from('payments')
    .select('status_detail')
    .eq('id', input.paymentLink.id)
    .maybeSingle();

  if (!isComboPrepaidPayment((paymentRow?.status_detail as string | null) ?? null)) {
    return;
  }

  const totalMonths = prepaidMonthsForTerm(billingTerm);
  if (!totalMonths || input.shippedCycleNumber >= totalMonths) return;

  const nextCycleNumber = input.shippedCycleNumber + 1;

  await supabase
    .from('subscriptions')
    .update({
      current_cycle: nextCycleNumber,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.subscriptionId);
}

export async function resolveCyclePaymentLink(
  supabase: SupabaseClient,
  cycle: {
    payment_id: string | null;
    amount_cents: number | null;
    paid_at: string | null;
  }
): Promise<{ id: string; amount_cents: number | null; paid_at: string | null } | null> {
  if (!cycle.payment_id) return null;

  const { data } = await supabase
    .from('payments')
    .select('id, amount_cents, paid_at')
    .eq('id', cycle.payment_id)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id as string,
    amount_cents: (data.amount_cents as number | null) ?? cycle.amount_cents,
    paid_at: (data.paid_at as string | null) ?? cycle.paid_at,
  };
}
