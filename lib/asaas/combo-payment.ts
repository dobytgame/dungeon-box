import type { SupabaseClient } from '@supabase/supabase-js';
import { asaasRequest } from '@/lib/asaas/client';
import { isAsaasPaymentConfirmed } from '@/lib/asaas/payment-status';
import type { AsaasWebhookPayment } from '@/lib/asaas/webhook-handlers';
import { activateSubscriptionFromAsaas } from '@/lib/subscriptions/activate-asaas';
import { seedPrepaidComboProductionSchedule } from '@/lib/subscriptions/combo-production-schedule';
import { notifyPurchaseCompleted } from '@/lib/email/subscription-notify';
import { notifyReferrerOnReferralConverted } from '@/lib/referral/referrer-notify';
import { createAdminClient } from '@/lib/supabase/admin';

const COMBO_REF_SUFFIX = ':combo';

type AsaasPaymentResponse = {
  id: string;
  status?: string;
  value?: number;
  externalReference?: string | null;
};

export function parseComboPaymentReference(
  externalReference?: string | null
): string | null {
  if (!externalReference?.endsWith(COMBO_REF_SUFFIX)) return null;
  const subscriptionId = externalReference.slice(0, -COMBO_REF_SUFFIX.length);
  return subscriptionId.length > 0 ? subscriptionId : null;
}

export async function handleComboPaymentConfirmed(
  supabase: SupabaseClient,
  payment: AsaasWebhookPayment,
  subscriptionId: string
): Promise<'processed' | 'skipped'> {
  const { data: local } = await supabase
    .from('subscriptions')
    .select(
      'id, status, user_id, prepaid_until, billing_term, combo_total_cents, combo_installments'
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!local || local.status !== 'pending') {
    return 'skipped';
  }

  const asaasAmountCents = Math.round((payment.value ?? 0) * 100);
  const amountCents =
    local.combo_total_cents != null && local.combo_total_cents > 0
      ? local.combo_total_cents
      : asaasAmountCents;
  const installments = local.combo_installments ?? 1;
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
        installments,
        status_detail: JSON.stringify({
          type: 'combo_prepaid',
          billing_term: local.billing_term,
          combo_total_cents: amountCents,
          combo_installments: installments > 1 ? installments : undefined,
        }),
      },
      { onConflict: 'asaas_payment_id' }
    )
    .select('id, amount_cents')
    .single();

  const activated = await activateSubscriptionFromAsaas(supabase, local.id);
  if (!activated) {
    console.error('[asaas] combo payment confirmed but activation failed:', local.id);
    return 'skipped';
  }

  if (paymentRow) {
    await seedPrepaidComboProductionSchedule(supabase, {
      subscriptionId: local.id,
      billingTerm: (local.billing_term as 'combo_3' | 'combo_6' | 'combo_12') ?? 'combo_3',
      paymentLink: {
        id: paymentRow.id,
        amount_cents: paymentRow.amount_cents,
        paid_at: now,
      },
      anchorDate: new Date(now),
    });
  }

  void notifyPurchaseCompleted(
    supabase,
    local.id,
    paymentRow?.amount_cents ?? amountCents,
    1
  ).catch((err) => {
    console.error('[email] combo purchase notify failed:', err);
  });

  void notifyReferrerOnReferralConverted(supabase, local.id).catch((err) => {
    console.error('[email] referral converted notify failed:', err);
  });

  return 'processed';
}

export async function syncComboPayment(
  asaasPaymentId: string
): Promise<'processed' | 'skipped'> {
  const payment = await asaasRequest<AsaasPaymentResponse>(
    `/payments/${asaasPaymentId}`
  );

  if (!isAsaasPaymentConfirmed(payment.status)) {
    return 'skipped';
  }

  const subscriptionId = parseComboPaymentReference(payment.externalReference);
  if (!subscriptionId) {
    return 'skipped';
  }

  const supabase = createAdminClient();
  const webhookPayment: AsaasWebhookPayment = {
    id: payment.id,
    externalReference: payment.externalReference ?? undefined,
    value: payment.value,
    status: payment.status,
  };

  return handleComboPaymentConfirmed(supabase, webhookPayment, subscriptionId);
}

export async function syncComboPaymentIfPending(
  supabase: SupabaseClient,
  subscriptionId: string,
  asaasPaymentId: string | null | undefined
): Promise<void> {
  if (!asaasPaymentId) return;

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (sub?.status !== 'pending') return;

  await syncComboPayment(asaasPaymentId).catch((err) => {
    console.error('[asaas] combo payment sync failed:', err);
  });
}
