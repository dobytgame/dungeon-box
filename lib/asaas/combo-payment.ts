import type { SupabaseClient } from '@supabase/supabase-js';
import {
  listAsaasPaymentsByExternalReference,
  resolveConfirmedInstallmentPayment,
} from '@/lib/asaas/installment-payments';
import { listAsaasCustomerPayments } from '@/lib/asaas/store-order-payment';
import type { AsaasWebhookPayment } from '@/lib/asaas/webhook-handlers';
import { activateSubscriptionFromAsaas } from '@/lib/subscriptions/activate-asaas';
import { seedPrepaidComboProductionSchedule } from '@/lib/subscriptions/combo-production-schedule';
import { notifyPurchaseCompleted } from '@/lib/email/subscription-notify';
import { notifyReferrerOnReferralConverted } from '@/lib/referral/referrer-notify';
import { createAdminClient } from '@/lib/supabase/admin';

const COMBO_REF_SUFFIX = ':combo';

function comboExternalReference(subscriptionId: string): string {
  return `${subscriptionId}${COMBO_REF_SUFFIX}`;
}

function toWebhookPayment(payment: {
  id: string;
  externalReference?: string | null;
  value?: number;
  status?: string;
}): AsaasWebhookPayment {
  return {
    id: payment.id,
    externalReference: payment.externalReference ?? undefined,
    value: payment.value,
    status: payment.status,
  };
}

export async function findConfirmedComboPaymentForSubscription(
  customerId: string,
  subscriptionId: string
): Promise<AsaasWebhookPayment | null> {
  const comboRef = comboExternalReference(subscriptionId);
  const seen = new Set<string>();
  const candidates: Array<{ id: string }> = [];

  const pushCandidate = (payment: { id?: string | null }) => {
    if (!payment.id || seen.has(payment.id)) return;
    seen.add(payment.id);
    candidates.push({ id: payment.id });
  };

  try {
    for (const payment of await listAsaasPaymentsByExternalReference(
      customerId,
      comboRef
    )) {
      pushCandidate(payment);
    }
  } catch (error) {
    console.error('[asaas] list combo payments by reference:', subscriptionId, error);
  }

  for (const payment of await listAsaasCustomerPayments(customerId)) {
    if (parseComboPaymentReference(payment.externalReference) === subscriptionId) {
      pushCandidate(payment);
    }
  }

  for (const candidate of candidates) {
    try {
      const confirmed = await resolveConfirmedInstallmentPayment(candidate.id);
      if (confirmed) {
        return toWebhookPayment(confirmed);
      }
    } catch (error) {
      console.error('[asaas] resolve combo installment payment:', candidate.id, error);
    }
  }

  return null;
}

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
  const confirmed = await resolveConfirmedInstallmentPayment(asaasPaymentId);
  if (!confirmed) {
    return 'skipped';
  }

  const subscriptionId = parseComboPaymentReference(confirmed.externalReference);
  if (!subscriptionId) {
    return 'skipped';
  }

  const supabase = createAdminClient();
  return handleComboPaymentConfirmed(
    supabase,
    toWebhookPayment(confirmed),
    subscriptionId
  );
}

export async function syncComboPaymentIfPending(
  supabase: SupabaseClient,
  subscriptionId: string,
  asaasPaymentId: string | null | undefined,
  customerId?: string | null
): Promise<void> {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, asaas_customer_id')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (sub?.status !== 'pending') return;

  if (asaasPaymentId) {
    const synced = await syncComboPayment(asaasPaymentId).catch((err) => {
      console.error('[asaas] combo payment sync failed:', err);
      return 'skipped' as const;
    });
    if (synced === 'processed') return;
  }

  const resolvedCustomerId = customerId ?? sub.asaas_customer_id ?? null;
  if (!resolvedCustomerId) return;

  const payment = await findConfirmedComboPaymentForSubscription(
    resolvedCustomerId,
    subscriptionId
  );
  if (!payment) return;

  await handleComboPaymentConfirmed(supabase, payment, subscriptionId).catch(
    (err) => {
      console.error('[asaas] combo payment lookup sync failed:', err);
    }
  );
}
