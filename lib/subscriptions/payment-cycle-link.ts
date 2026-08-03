import type { SupabaseClient } from '@supabase/supabase-js';

export async function findSubscriptionCycleForPayment(
  supabase: SupabaseClient,
  subscriptionId: string,
  paymentId: string
): Promise<number | null> {
  const { data } = await supabase
    .from('subscription_cycles')
    .select('cycle_number')
    .eq('subscription_id', subscriptionId)
    .eq('payment_id', paymentId)
    .order('cycle_number', { ascending: true })
    .limit(1)
    .maybeSingle();

  return (data?.cycle_number as number | undefined) ?? null;
}

export async function isPaymentAlreadyLinkedToSubscriptionCycle(
  supabase: SupabaseClient,
  subscriptionId: string,
  paymentId: string
): Promise<boolean> {
  const cycleNumber = await findSubscriptionCycleForPayment(
    supabase,
    subscriptionId,
    paymentId
  );
  return cycleNumber != null;
}

/** Restaura paid_at quando webhook/import sobrescreveu com data de reprocessamento. */
export async function restoreCorruptedPaymentPaidAt(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<number> {
  const { data: links } = await supabase
    .from('subscription_cycles')
    .select('cycle_number, paid_at, payment_id')
    .eq('subscription_id', subscriptionId)
    .not('payment_id', 'is', null)
    .order('cycle_number', { ascending: true });

  const canonicalPaidAtByPayment = new Map<string, string>();

  for (const link of links ?? []) {
    const paymentId = link.payment_id as string | null;
    const cyclePaidAt = link.paid_at as string | null;
    if (!paymentId || !cyclePaidAt) continue;

    const existing = canonicalPaidAtByPayment.get(paymentId);
    if (!existing || cyclePaidAt < existing) {
      canonicalPaidAtByPayment.set(paymentId, cyclePaidAt);
    }
  }

  let fixed = 0;

  for (const [paymentId, canonicalPaidAt] of Array.from(
    canonicalPaidAtByPayment.entries()
  )) {
    const { data: payment } = await supabase
      .from('payments')
      .select('paid_at, created_at')
      .eq('id', paymentId)
      .maybeSingle();

    const paymentPaidAt = payment?.paid_at as string | null;
    if (!paymentPaidAt) continue;

    const paymentMs = new Date(paymentPaidAt).getTime();
    const canonicalMs = new Date(canonicalPaidAt).getTime();
    const createdMs = payment?.created_at
      ? new Date(payment.created_at as string).getTime()
      : canonicalMs;

    if (
      Number.isNaN(paymentMs) ||
      Number.isNaN(canonicalMs) ||
      paymentMs <= canonicalMs + 24 * 60 * 60 * 1000
    ) {
      continue;
    }

    const restoredPaidAt =
      createdMs < canonicalMs
        ? new Date(createdMs).toISOString()
        : canonicalPaidAt;

    const { error } = await supabase
      .from('payments')
      .update({ paid_at: restoredPaidAt })
      .eq('id', paymentId);

    if (!error) fixed += 1;
  }

  return fixed;
}
