import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeAsaasSubscriptionRef } from '@/lib/asaas/refs';
import { activateSubscriptionFromAsaas } from '@/lib/subscriptions/activate-asaas';
import { ensureSubscriptionCycle } from '@/lib/subscriptions/cycles';
import { calculateLoyaltyLevel } from '@/lib/subscriptions/loyalty';
import {
  notifyPurchaseCompleted,
  notifySubscriptionCancelled,
} from '@/lib/email/subscription-notify';

export type AsaasWebhookPayment = {
  id: string;
  subscription?: string | { id?: string } | null;
  externalReference?: string | null;
  value?: number;
  status?: string;
  billingType?: string;
};

async function findSubscriptionByAsaasId(
  supabase: SupabaseClient,
  asaasSubscriptionId: string
) {
  const { data } = await supabase
    .from('subscriptions')
    .select('id, status, started_at, user_id, current_cycle, asaas_subscription_id')
    .eq('asaas_subscription_id', asaasSubscriptionId)
    .maybeSingle();
  return data;
}

async function findSubscriptionByExternalReference(
  supabase: SupabaseClient,
  externalReference: string
) {
  const { data } = await supabase
    .from('subscriptions')
    .select('id, status, started_at, user_id, current_cycle, asaas_subscription_id')
    .eq('id', externalReference)
    .maybeSingle();
  return data;
}

async function resolveLocalSubscription(
  supabase: SupabaseClient,
  payment: AsaasWebhookPayment
) {
  const asaasSubscriptionId = normalizeAsaasSubscriptionRef(payment.subscription);
  if (asaasSubscriptionId) {
    const byAsaas = await findSubscriptionByAsaasId(supabase, asaasSubscriptionId);
    if (byAsaas) return byAsaas;
  }

  if (payment.externalReference) {
    return findSubscriptionByExternalReference(supabase, payment.externalReference);
  }

  return null;
}

function paymentAmountCents(payment: AsaasWebhookPayment): number {
  const value = payment.value ?? 0;
  return Math.round(value * 100);
}

export async function handleAsaasPaymentConfirmed(
  supabase: SupabaseClient,
  payment: AsaasWebhookPayment
): Promise<'processed' | 'skipped'> {
  const local = await resolveLocalSubscription(supabase, payment);
  if (!local) return 'skipped';

  const amountCents = paymentAmountCents(payment);
  const now = new Date().toISOString();

  const { data: paymentRow } = await supabase
    .from('payments')
    .upsert(
      {
        user_id: local.user_id,
        subscription_id: local.id,
        asaas_payment_id: payment.id,
        amount_cents: amountCents,
        currency: 'BRL',
        status: 'approved',
        paid_at: now,
      },
      { onConflict: 'asaas_payment_id' }
    )
    .select('id, amount_cents')
    .single();

  if (local.status === 'pending') {
    await activateSubscriptionFromAsaas(supabase, local.id);
    void notifyPurchaseCompleted(supabase, local.id, amountCents, 1).catch(
      (err) => {
        console.error('[email] purchase completed notify failed:', err);
      }
    );
    return 'processed';
  }

  const paidCycleNumber = local.current_cycle ?? 1;

  await supabase
    .from('subscription_cycles')
    .update({
      status: 'preparing',
      payment_id: paymentRow?.id ?? null,
      paid_at: now,
      amount_cents: paymentRow?.amount_cents ?? amountCents,
      updated_at: now,
    })
    .eq('subscription_id', local.id)
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
    .eq('id', local.id);

  await ensureSubscriptionCycle(supabase, local.id, nextCycle);
  return 'processed';
}

export async function handleAsaasPaymentOverdue(
  supabase: SupabaseClient,
  payment: AsaasWebhookPayment
): Promise<'processed' | 'skipped'> {
  const local = await resolveLocalSubscription(supabase, payment);
  if (!local || local.status === 'cancelled') return 'skipped';

  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('id', local.id);

  return 'processed';
}

export async function handleAsaasPaymentRefunded(
  supabase: SupabaseClient,
  payment: AsaasWebhookPayment
): Promise<'processed' | 'skipped'> {
  const local = await resolveLocalSubscription(supabase, payment);
  if (!local) return 'skipped';

  const now = new Date().toISOString();

  await supabase
    .from('payments')
    .update({
      status: 'refunded',
    })
    .eq('asaas_payment_id', payment.id);

  if (local.status === 'active' || local.status === 'past_due') {
    await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: now,
        cancel_reason: 'Estorno via Asaas',
        updated_at: now,
      })
      .eq('id', local.id);

    void notifySubscriptionCancelled(supabase, local.id).catch((err) => {
      console.error('[email] subscription cancelled notify failed:', err);
    });
  }

  return 'processed';
}
