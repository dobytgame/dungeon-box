import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveLocalAsaasSubscription } from '@/lib/asaas/resolve-local-subscription';
import { activateSubscriptionFromAsaas } from '@/lib/subscriptions/activate-asaas';
import { markCyclePreparing, processActiveSubscriptionPayment } from '@/lib/subscriptions/cycles';
import { applyPendingPlanUpgrade } from '@/lib/subscriptions/upgrade';
import {
  notifyPurchaseCompleted,
  notifySubscriptionCancelled,
} from '@/lib/email/subscription-notify';
import { cancelReferralForSubscription } from '@/lib/referral/referrals';
import { cancelPendingRedemptionsForUser } from '@/lib/referral/redemptions';
import { notifyReferrerOnReferralConverted } from '@/lib/referral/referrer-notify';
import {
  handleComboPaymentConfirmed,
  parseComboPaymentReference,
} from '@/lib/asaas/combo-payment';
import { resolveConfirmedInstallmentPayment } from '@/lib/asaas/installment-payments';
import { handleStoreOrderPaymentConfirmed } from '@/lib/asaas/store-order-payment';
import { isComboInstallmentSlicePayment } from '@/lib/payments/effective-amount';
import { findCanonicalComboPrepaidPayment } from '@/lib/payments/combo-payment-queries';

export type AsaasWebhookPayment = {
  id: string;
  subscription?: string | { id?: string } | null;
  externalReference?: string | null;
  value?: number;
  status?: string;
  billingType?: string;
  installment?: string | null;
  installmentNumber?: number | null;
};

function paymentAmountCents(payment: AsaasWebhookPayment): number {
  const value = payment.value ?? 0;
  return Math.round(value * 100);
}

export async function handleAsaasPaymentConfirmed(
  supabase: SupabaseClient,
  payment: AsaasWebhookPayment
): Promise<'processed' | 'skipped'> {
  const storeResult = await handleStoreOrderPaymentConfirmed(supabase, payment);
  if (storeResult === 'processed') {
    return 'processed';
  }

  const comboSubscriptionId = parseComboPaymentReference(payment.externalReference);
  if (comboSubscriptionId) {
    const confirmed = await resolveConfirmedInstallmentPayment({
      id: payment.id,
      status: payment.status,
      externalReference: payment.externalReference,
      installment: payment.installment,
      installmentNumber: payment.installmentNumber,
      value: payment.value,
    });
    if (!confirmed) {
      return 'skipped';
    }

    const subscriptionId =
      parseComboPaymentReference(confirmed.externalReference) ?? comboSubscriptionId;

    return handleComboPaymentConfirmed(supabase, {
      id: confirmed.id,
      externalReference: confirmed.externalReference ?? undefined,
      value: confirmed.value,
      status: confirmed.status,
      billingType: payment.billingType,
    }, subscriptionId);
  }

  const local = await resolveLocalAsaasSubscription(supabase, payment);
  if (!local) return 'skipped';

  const amountCents = paymentAmountCents(payment);

  const { data: subscriptionBilling } = await supabase
    .from('subscriptions')
    .select('billing_term, combo_total_cents, combo_installments')
    .eq('id', local.id)
    .maybeSingle();

  if (
    subscriptionBilling &&
    isComboInstallmentSlicePayment(
      { amount_cents: amountCents, status_detail: null },
      subscriptionBilling
    )
  ) {
    const existingComboPrepaid = await findCanonicalComboPrepaidPayment(supabase, local.id);

    if (existingComboPrepaid) {
      return 'skipped';
    }
  }

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
    void notifyReferrerOnReferralConverted(supabase, local.id).catch((err) => {
      console.error('[email] referral converted notify failed:', err);
    });
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

    await cancelReferralForSubscription(supabase, local.id);
    await cancelPendingRedemptionsForUser(supabase, local.user_id);

    void notifySubscriptionCancelled(supabase, local.id).catch((err) => {
      console.error('[email] subscription cancelled notify failed:', err);
    });
  }

  return 'processed';
}
