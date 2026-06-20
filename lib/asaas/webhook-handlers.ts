import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveLocalAsaasSubscription } from '@/lib/asaas/resolve-local-subscription';
import { activateSubscriptionFromAsaas } from '@/lib/subscriptions/activate-asaas';
import { markCyclePreparing, processActiveSubscriptionPayment } from '@/lib/subscriptions/cycles';
import { applyPendingPlanUpgrade } from '@/lib/subscriptions/upgrade';
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

function paymentAmountCents(payment: AsaasWebhookPayment): number {
  const value = payment.value ?? 0;
  return Math.round(value * 100);
}

export async function handleAsaasPaymentConfirmed(
  supabase: SupabaseClient,
  payment: AsaasWebhookPayment
): Promise<'processed' | 'skipped'> {
  const local = await resolveLocalAsaasSubscription(supabase, payment);
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
    const activated = await activateSubscriptionFromAsaas(supabase, local.id);
    if (!activated) {
      console.error('[asaas] payment confirmed but activation failed:', local.id);
      return 'skipped';
    }
    if (paymentRow) {
      await markCyclePreparing(supabase, local.id, 1, {
        id: paymentRow.id,
        amount_cents: paymentRow.amount_cents,
        paid_at: now,
      });
    }
    void notifyPurchaseCompleted(supabase, local.id, amountCents, 1).catch(
      (err) => {
        console.error('[email] purchase completed notify failed:', err);
      }
    );
    return 'processed';
  }

  await applyPendingPlanUpgrade(supabase, local.id);

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  if (paymentRow) {
    await processActiveSubscriptionPayment(
      supabase,
      local.id,
      local.current_cycle,
      {
        id: paymentRow.id,
        amount_cents: paymentRow.amount_cents,
        paid_at: now,
      },
      periodEnd.toISOString()
    );
  }

  return 'processed';
}

export async function handleAsaasPaymentOverdue(
  supabase: SupabaseClient,
  payment: AsaasWebhookPayment
): Promise<'processed' | 'skipped'> {
  const local = await resolveLocalAsaasSubscription(supabase, payment);
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
  const local = await resolveLocalAsaasSubscription(supabase, payment);
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
