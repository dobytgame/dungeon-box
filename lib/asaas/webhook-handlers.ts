import type { SupabaseClient } from '@supabase/supabase-js';
import { notifyAdminSubscriptionEvent } from '@/lib/admin/subscription-payment-notifications';
import { resolveLocalAsaasSubscription } from '@/lib/asaas/resolve-local-subscription';
import { activateSubscriptionFromAsaas } from '@/lib/subscriptions/activate-asaas';
import { markCyclePreparing, processActiveSubscriptionPayment } from '@/lib/subscriptions/cycles';
import { recreateAsaasSubscriptionForBillingPlan } from '@/lib/asaas/plan-upgrade-recurrence';
import { reconcileAsaasSubscriptionPendingPayment } from '@/lib/asaas/upgrade-payment-sync';
import { applyPendingPlanUpgrade } from '@/lib/subscriptions/upgrade';
import {
  notifyPlanUpgradeApplied,
  notifyPurchaseCompleted,
  notifySubscriptionCancelled,
} from '@/lib/email/subscription-notify';
import { cancelReferralForSubscription } from '@/lib/referral/referrals';
import { cancelPendingRedemptionsForUser } from '@/lib/referral/redemptions';
import { cleanupSubscriptionCyclesOnCancel } from '@/lib/subscriptions/cycles';
import { notifyReferrerOnReferralConverted } from '@/lib/referral/referrer-notify';
import {
  handleComboPaymentConfirmed,
  parseComboPaymentReference,
  parseComboTierPaymentReference,
} from '@/lib/asaas/combo-payment';
import { handleComboTierUpgradePaymentConfirmed } from '@/lib/subscriptions/combo-tier-upgrade';
import { resolveConfirmedInstallmentPayment } from '@/lib/asaas/installment-payments';
import {
  handleStoreOrderPaymentConfirmed,
  parseStoreOrderExternalReference,
  parseStoreOrderMeta,
} from '@/lib/asaas/store-order-payment';
import { isComboInstallmentSlicePayment } from '@/lib/payments/effective-amount';
import { findCanonicalComboPrepaidPayment } from '@/lib/payments/combo-payment-queries';
import { isComboSubscription } from '@/lib/payments/revenue-aggregation';
import { isNonBillingAsaasPayment } from '@/lib/subscriptions/billing-cycle-payments';
import { isPaymentAlreadyLinkedToSubscriptionCycle } from '@/lib/subscriptions/payment-cycle-link';
import { isComboTerm, type BillingTerm } from '@/lib/checkout/combo-billing';
import { seedPrepaidComboProductionSchedule } from '@/lib/subscriptions/combo-production-schedule';
import { parseBrazilDateOnlyToIso, resolveGatewayPaidAt } from '@/lib/datetime/brazil';

export type AsaasWebhookPayment = {
  id: string;
  subscription?: string | { id?: string } | null;
  externalReference?: string | null;
  value?: number;
  status?: string;
  billingType?: string;
  installment?: string | null;
  installmentNumber?: number | null;
  paymentDate?: string | null;
};

function paymentAmountCents(payment: AsaasWebhookPayment): number {
  const value = payment.value ?? 0;
  return Math.round(value * 100);
}

export async function handleAsaasPaymentConfirmed(
  supabase: SupabaseClient,
  payment: AsaasWebhookPayment
): Promise<'processed' | 'skipped'> {
  const storeReference = parseStoreOrderExternalReference(
    payment.externalReference
  );
  if (storeReference) {
    const storeResult = await handleStoreOrderPaymentConfirmed(supabase, payment);
    return storeResult;
  }

  const comboTierSubscriptionId = parseComboTierPaymentReference(
    payment.externalReference
  );
  if (comboTierSubscriptionId) {
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
      parseComboTierPaymentReference(confirmed.externalReference) ??
      comboTierSubscriptionId;

    return handleComboTierUpgradePaymentConfirmed(
      supabase,
      {
        id: confirmed.id,
        externalReference: confirmed.externalReference ?? undefined,
        value: confirmed.value,
        status: confirmed.status,
        billingType: payment.billingType,
      },
      subscriptionId
    );
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
    .select(
      'billing_term, combo_total_cents, combo_installments, prepaid_months, prepaid_until'
    )
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

  if (subscriptionBilling && isComboSubscription(subscriptionBilling)) {
    const existingComboPrepaid = await findCanonicalComboPrepaidPayment(
      supabase,
      local.id
    );
    if (existingComboPrepaid && existingComboPrepaid.asaas_payment_id !== payment.id) {
      await supabase.from('payments').upsert(
        {
          user_id: local.user_id,
          subscription_id: local.id,
          asaas_payment_id: payment.id,
          amount_cents: amountCents,
          currency: 'BRL',
          status: 'cancelled',
          status_detail: JSON.stringify({
            type: 'phantom_duplicate_import',
            reason: 'combo_recurring_webhook',
          }),
        },
        { onConflict: 'asaas_payment_id' }
      );
      return 'skipped';
    }
  }

  const prepaidUntil = subscriptionBilling?.prepaid_until
    ? new Date(subscriptionBilling.prepaid_until)
    : null;
  if (prepaidUntil && prepaidUntil > new Date()) {
    const existingComboPrepaid = await findCanonicalComboPrepaidPayment(
      supabase,
      local.id
    );
    if (existingComboPrepaid && existingComboPrepaid.asaas_payment_id !== payment.id) {
      await supabase.from('payments').upsert(
        {
          user_id: local.user_id,
          subscription_id: local.id,
          asaas_payment_id: payment.id,
          amount_cents: amountCents,
          currency: 'BRL',
          status: 'cancelled',
          status_detail: JSON.stringify({
            type: 'phantom_duplicate_import',
            reason: 'prepaid_period_charge',
          }),
        },
        { onConflict: 'asaas_payment_id' }
      );
      return 'skipped';
    }
  }

  const now = new Date().toISOString();

  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id, paid_at, status, status_detail')
    .eq('asaas_payment_id', payment.id)
    .maybeSingle();

  if (parseStoreOrderMeta(existingPayment?.status_detail)) {
    return handleStoreOrderPaymentConfirmed(supabase, payment);
  }

  if (
    existingPayment &&
    local.status === 'active' &&
    (await isPaymentAlreadyLinkedToSubscriptionCycle(
      supabase,
      local.id,
      existingPayment.id as string
    ))
  ) {
    return 'skipped';
  }

  const paidAt = resolveGatewayPaidAt(
    existingPayment?.paid_at as string | null,
    payment.paymentDate?.trim()
      ? parseBrazilDateOnlyToIso(payment.paymentDate.trim())
      : null,
    now
  );

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
        paid_at: paidAt,
      },
      { onConflict: 'asaas_payment_id' }
    )
    .select('id, amount_cents')
    .single();

  if (
    isNonBillingAsaasPayment({
      externalReference: payment.externalReference,
      amountCents,
      statusDetail: existingPayment?.status_detail as string | null | undefined,
    })
  ) {
    return 'processed';
  }

  if (local.status === 'pending') {
    const activated = await activateSubscriptionFromAsaas(supabase, local.id);
    if (!activated) {
      console.error('[asaas] payment confirmed but activation failed:', local.id);
      return 'skipped';
    }
    if (paymentRow) {
      const billingTerm =
        (subscriptionBilling?.billing_term as BillingTerm | null) ?? 'monthly';
      if (isComboTerm(billingTerm)) {
        await seedPrepaidComboProductionSchedule(supabase, {
          subscriptionId: local.id,
          billingTerm,
          paymentLink: {
            id: paymentRow.id,
            amount_cents: paymentRow.amount_cents,
            paid_at: paidAt,
          },
          anchorDate: new Date(paidAt),
        });
      } else {
        await markCyclePreparing(supabase, local.id, 1, {
          id: paymentRow.id,
          amount_cents: paymentRow.amount_cents,
          paid_at: paidAt,
        });
      }
    }
    void notifyPurchaseCompleted(supabase, local.id, amountCents, 1).catch(
      (err) => {
        console.error('[email] purchase completed notify failed:', err);
      }
    );
    void notifyReferrerOnReferralConverted(supabase, local.id).catch((err) => {
      console.error('[email] referral converted notify failed:', err);
    });
    void notifyAdminSubscriptionEvent(supabase, {
      type: 'subscription_activated',
      subscriptionId: local.id,
      userId: local.user_id,
      paymentId: paymentRow?.id ?? null,
      amountCents,
      paymentMethod: payment.billingType?.toLowerCase() ?? 'credit_card',
      gateway: 'asaas',
      cycleNumber: 1,
    }).catch((err) => {
      console.error('[admin] subscription activated notify failed:', err);
    });
    return 'processed';
  }

  const appliedUpgrade = await applyPendingPlanUpgrade(supabase, local.id);

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
        paid_at: paidAt,
      },
      periodEnd.toISOString()
    );
  }

  void notifyAdminSubscriptionEvent(supabase, {
    type: 'subscription_renewal_paid',
    subscriptionId: local.id,
    userId: local.user_id,
    paymentId: paymentRow?.id ?? null,
    amountCents,
    paymentMethod: payment.billingType?.toLowerCase() ?? 'credit_card',
    gateway: 'asaas',
    cycleNumber: local.current_cycle,
  }).catch((err) => {
    console.error('[admin] subscription renewal notify failed:', err);
  });

  if (appliedUpgrade) {
    const { data: billingRow } = await supabase
      .from('subscriptions')
      .select('next_billing_date')
      .eq('id', local.id)
      .maybeSingle();

    void recreateAsaasSubscriptionForBillingPlan(supabase, local.id).catch(
      (err) => {
        console.warn('[asaas] post-upgrade recurrence recreate failed:', err);
      }
    );

    void notifyPlanUpgradeApplied(supabase, local.id, {
      previousPlanName: appliedUpgrade.previousPlanName,
      newPlanName: appliedUpgrade.newPlanName,
      nextBillingDate:
        billingRow?.next_billing_date ?? periodEnd.toISOString(),
    }).catch((err) => {
      console.error('[email] plan upgrade applied notify failed:', err);
    });
  }

  return 'processed';
}

export async function handleAsaasPaymentCreated(
  supabase: SupabaseClient,
  payment: AsaasWebhookPayment
): Promise<'processed' | 'skipped'> {
  const local = await resolveLocalAsaasSubscription(supabase, payment);
  if (!local || local.status !== 'active') return 'skipped';

  const result = await reconcileAsaasSubscriptionPendingPayment(
    supabase,
    local.id,
    payment.id
  );

  return result === 'skipped' ? 'skipped' : 'processed';
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

  void notifyAdminSubscriptionEvent(supabase, {
    type: 'subscription_payment_failed',
    subscriptionId: local.id,
    userId: local.user_id,
    gateway: 'asaas',
    detail: 'Pagamento em atraso no Asaas.',
  }).catch((err) => {
    console.error('[admin] subscription payment failed notify:', err);
  });

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
    await cleanupSubscriptionCyclesOnCancel(supabase, local.id);

    void notifySubscriptionCancelled(supabase, local.id).catch((err) => {
      console.error('[email] subscription cancelled notify failed:', err);
    });
    void notifyAdminSubscriptionEvent(supabase, {
      type: 'subscription_cancelled',
      subscriptionId: local.id,
      userId: local.user_id,
      gateway: 'asaas',
      detail: 'Estorno via Asaas.',
    }).catch((err) => {
      console.error('[admin] subscription cancelled notify failed:', err);
    });
  }

  return 'processed';
}
