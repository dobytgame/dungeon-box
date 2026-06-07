import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchMpPayment, fetchMpPreapproval } from '@/lib/mercadopago/safe-fetch';
import { activateSubscriptionFromMp } from '@/lib/subscriptions/activate';
import { ensureSubscriptionCycle } from '@/lib/subscriptions/cycles';
import { calculateLoyaltyLevel } from '@/lib/subscriptions/loyalty';
import type { PaymentStatus, SubscriptionStatus } from '@/lib/dashboard/types';

type MpPayment = {
  id?: string | number;
  status?: string;
  status_detail?: string;
  transaction_amount?: number;
  payment_method_id?: string;
  payment_type_id?: string;
  preapproval_id?: string;
  card?: {
    last_four_digits?: string;
    cardholder?: { name?: string };
  };
};

function mapPaymentStatus(mpStatus?: string): PaymentStatus {
  const allowed: PaymentStatus[] = [
    'pending',
    'approved',
    'authorized',
    'in_process',
    'rejected',
    'cancelled',
    'refunded',
    'charged_back',
  ];
  if (mpStatus && allowed.includes(mpStatus as PaymentStatus)) {
    return mpStatus as PaymentStatus;
  }
  return 'in_process';
}

function mapPreapprovalStatus(mpStatus?: string): SubscriptionStatus | null {
  switch (mpStatus) {
    case 'authorized':
      return 'active';
    case 'paused':
      return 'paused';
    case 'cancelled':
      return 'cancelled';
    case 'pending':
      return 'pending';
    default:
      return null;
  }
}

export async function handleSubscriptionPreapprovalEvent(
  supabase: SupabaseClient,
  mpSubscriptionId: string
): Promise<'processed' | 'skipped'> {
  const mpSubRaw = await fetchMpPreapproval(mpSubscriptionId);
  if (!mpSubRaw) return 'skipped';

  const mpSub = mpSubRaw as {
    status?: string;
    payer_id?: number | string | null;
  };

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, status, started_at, user_id')
    .eq('mp_subscription_id', mpSubscriptionId)
    .maybeSingle();

  if (!subscription) {
    console.warn('[mp-webhook] subscription not found:', mpSubscriptionId);
    return 'skipped';
  }

  const previousStatus = subscription.status;
  const newStatus = mapPreapprovalStatus(mpSub.status);

  if (newStatus === 'active' && previousStatus === 'pending') {
    await activateSubscriptionFromMp(supabase, subscription.id, mpSub);
    return 'processed';
  }

  if (!newStatus || newStatus === previousStatus) return 'skipped';

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    status: newStatus,
    updated_at: now,
    mp_payer_id:
      mpSub.payer_id != null ? String(mpSub.payer_id) : undefined,
  };

  if (newStatus === 'cancelled') {
    updates.cancelled_at = now;
    updates.cancel_reason = 'Cancelado via Mercado Pago';
  }

  if (newStatus === 'active' && !subscription.started_at) {
    updates.started_at = now;
  }

  await supabase.from('subscriptions').update(updates).eq('id', subscription.id);
  return 'processed';
}

export async function handlePaymentEvent(
  supabase: SupabaseClient,
  mpPaymentId: string
): Promise<'processed' | 'skipped'> {
  const mpPaymentRaw = await fetchMpPayment(mpPaymentId);
  if (!mpPaymentRaw) return 'skipped';

  const mpPayment = mpPaymentRaw as MpPayment;

  const preapprovalId = mpPayment.preapproval_id;
  if (!preapprovalId) {
    console.warn('[mp-webhook] payment without preapproval_id:', mpPaymentId);
    return 'skipped';
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, user_id, status, current_cycle')
    .eq('mp_subscription_id', preapprovalId)
    .maybeSingle();

  if (!subscription) {
    console.warn('[mp-webhook] subscription for payment not found:', preapprovalId);
    return 'skipped';
  }

  const mappedStatus = mapPaymentStatus(mpPayment.status);
  const amountCents = Math.round((mpPayment.transaction_amount ?? 0) * 100);
  const now = new Date().toISOString();

  const { data: payment } = await supabase
    .from('payments')
    .upsert(
      {
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        mp_payment_id: String(mpPaymentId),
        amount_cents: amountCents,
        status: mappedStatus,
        status_detail: mpPayment.status_detail ?? null,
        payment_method: mpPayment.payment_method_id ?? null,
        payment_type: mpPayment.payment_type_id ?? null,
        card_last4: mpPayment.card?.last_four_digits ?? null,
        card_brand: mpPayment.card?.cardholder?.name ?? null,
        paid_at: mappedStatus === 'approved' ? now : null,
        mp_raw_payload: mpPayment as object,
      },
      { onConflict: 'mp_payment_id' }
    )
    .select('id, amount_cents')
    .single();

  if (mappedStatus === 'approved') {
    const paidCycleNumber = subscription.current_cycle ?? 1;

    await supabase
      .from('subscription_cycles')
      .update({
        status: 'preparing',
        payment_id: payment?.id ?? null,
        paid_at: now,
        amount_cents: payment?.amount_cents ?? amountCents,
        updated_at: now,
      })
      .eq('subscription_id', subscription.id)
      .eq('cycle_number', paidCycleNumber);

    const nextCycle = paidCycleNumber + 1;
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_cycle: nextCycle,
        loyalty_level: calculateLoyaltyLevel(nextCycle - 1),
        current_period_start: now,
        current_period_end: periodEnd.toISOString(),
        next_billing_date: periodEnd.toISOString(),
        updated_at: now,
      })
      .eq('id', subscription.id);

    await ensureSubscriptionCycle(supabase, subscription.id, nextCycle);
    return 'processed';
  }

  if (mappedStatus === 'rejected' || mappedStatus === 'cancelled') {
    await supabase
      .from('subscriptions')
      .update({ status: 'past_due', updated_at: now })
      .eq('id', subscription.id);
  }

  return 'processed';
}
