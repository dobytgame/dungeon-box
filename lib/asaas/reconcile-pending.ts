import type { SupabaseClient } from '@supabase/supabase-js';
import {
  handleComboPaymentConfirmed,
  parseComboPaymentReference,
  findConfirmedComboPaymentForSubscription,
} from '@/lib/asaas/combo-payment';
import { resolveConfirmedInstallmentPayment } from '@/lib/asaas/installment-payments';
import {
  collectRemotePaymentsForSubscription,
  type ImportAsaasPaymentsInput,
} from '@/lib/asaas/import-payments';
import {
  backfillAsaasSubscriptionId,
  paymentAsaasSubscriptionIdMatches,
  paymentBelongsToLocalSubscription,
  paymentExternalReferenceMatchesSubscription,
} from '@/lib/asaas/subscription-link';
import { fetchAsaasPayment } from '@/lib/asaas/one-time-payment';
import { isAsaasPaymentConfirmed } from '@/lib/asaas/payment-status';
import {
  syncAsaasSubscriptionPayments,
  toAsaasWebhookPayment,
} from '@/lib/asaas/payment-sync';
import {
  isComboExternalReference,
  parseSubscriptionExternalReference,
} from '@/lib/asaas/refs';
import { listAsaasCustomerPayments } from '@/lib/asaas/store-order-payment';
import { handleAsaasPaymentConfirmed } from '@/lib/asaas/webhook-handlers';
import type { BillingTerm } from '@/lib/checkout/combo-billing';
import { isComboTerm } from '@/lib/checkout/combo-billing';
import { activateSubscriptionFromAsaas } from '@/lib/subscriptions/activate-asaas';
import { markCyclePreparing } from '@/lib/subscriptions/cycles';
import { notifyPurchaseCompleted } from '@/lib/email/subscription-notify';
import { notifyReferrerOnReferralConverted } from '@/lib/referral/referrer-notify';

export type ReconcileAsaasSubscriptionInput = {
  id: string;
  user_id?: string | null;
  status: string;
  asaas_subscription_id?: string | null;
  asaas_customer_id?: string | null;
  billing_term?: string | null;
};

type CustomerPayment = Awaited<
  ReturnType<typeof listAsaasCustomerPayments>
>[number];

function toImportInput(
  subscription: ReconcileAsaasSubscriptionInput,
  userId: string
): ImportAsaasPaymentsInput {
  return {
    id: subscription.id,
    user_id: userId,
    asaas_subscription_id: subscription.asaas_subscription_id,
    asaas_customer_id: subscription.asaas_customer_id,
    billing_term: subscription.billing_term,
  };
}

async function paymentMatchesSubscription(
  payment: CustomerPayment,
  subscription: ReconcileAsaasSubscriptionInput
): Promise<boolean> {
  if (!isAsaasPaymentConfirmed(payment.status)) return false;

  if (
    paymentExternalReferenceMatchesSubscription(
      payment.externalReference,
      subscription.id
    )
  ) {
    return true;
  }

  if (
    paymentAsaasSubscriptionIdMatches(
      payment,
      subscription.asaas_subscription_id
    )
  ) {
    return true;
  }

  return paymentBelongsToLocalSubscription(payment, subscription);
}

async function ensureAsaasSubscriptionLink(
  supabase: SupabaseClient,
  subscription: ReconcileAsaasSubscriptionInput
): Promise<void> {
  if (subscription.asaas_subscription_id) return;

  const customerId = await resolveAsaasCustomerId(supabase, subscription);
  if (!customerId) return;

  const payments = await listAsaasCustomerPayments(customerId);
  const asaasSubscriptionId = await backfillAsaasSubscriptionId(
    supabase,
    subscription,
    payments
  );

  if (asaasSubscriptionId) {
    subscription.asaas_subscription_id = asaasSubscriptionId;
    subscription.asaas_customer_id = customerId;
  }
}

async function resolveAsaasCustomerId(
  supabase: SupabaseClient,
  subscription: ReconcileAsaasSubscriptionInput
): Promise<string | null> {
  if (subscription.asaas_customer_id) {
    return subscription.asaas_customer_id;
  }

  if (!subscription.user_id) {
    const { data } = await supabase
      .from('subscriptions')
      .select('user_id, asaas_customer_id')
      .eq('id', subscription.id)
      .maybeSingle();

    if (data?.asaas_customer_id) {
      return data.asaas_customer_id;
    }

    subscription.user_id = data?.user_id ?? null;
  }

  if (!subscription.user_id) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('asaas_customer_id')
    .eq('id', subscription.user_id)
    .maybeSingle();

  const customerId = profile?.asaas_customer_id ?? null;
  if (!customerId) return null;

  await supabase
    .from('subscriptions')
    .update({
      asaas_customer_id: customerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscription.id);

  subscription.asaas_customer_id = customerId;
  return customerId;
}

async function activateFromApprovedPaymentRow(
  supabase: SupabaseClient,
  subscriptionId: string,
  payment: { id: string; amount_cents: number | null; paid_at: string | null }
): Promise<boolean> {
  const activated = await activateSubscriptionFromAsaas(supabase, subscriptionId);
  if (!activated) return false;

  const paidAt = payment.paid_at ?? new Date().toISOString();
  await markCyclePreparing(supabase, subscriptionId, 1, {
    id: payment.id,
    amount_cents: payment.amount_cents,
    paid_at: paidAt,
  });

  void notifyPurchaseCompleted(
    supabase,
    subscriptionId,
    payment.amount_cents ?? 0,
    1
  ).catch((err) => {
    console.error('[email] purchase completed notify failed:', err);
  });

  void notifyReferrerOnReferralConverted(supabase, subscriptionId).catch((err) => {
    console.error('[email] referral converted notify failed:', err);
  });

  return true;
}

async function reconcileFromLocalApprovedPayment(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<boolean> {
  const { data: payment } = await supabase
    .from('payments')
    .select('id, amount_cents, paid_at')
    .eq('subscription_id', subscriptionId)
    .eq('status', 'approved')
    .order('paid_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (!payment) return false;
  return activateFromApprovedPaymentRow(supabase, subscriptionId, payment);
}

async function reconcileFromLocalPendingAsaasPayments(
  supabase: SupabaseClient,
  subscription: ReconcileAsaasSubscriptionInput
): Promise<boolean> {
  const { data: payments } = await supabase
    .from('payments')
    .select('asaas_payment_id')
    .eq('subscription_id', subscription.id)
    .eq('status', 'pending')
    .not('asaas_payment_id', 'is', null)
    .limit(5);

  for (const row of payments ?? []) {
    if (!row.asaas_payment_id) continue;

    try {
      const remote = await fetchAsaasPayment(row.asaas_payment_id);
      const confirmed = await resolveConfirmedInstallmentPayment({
        id: remote.id,
        status: remote.status,
        externalReference: remote.externalReference,
        installment: remote.installment,
        installmentNumber: remote.installmentNumber,
        value: remote.value,
      });
      if (!confirmed) continue;

      const comboId = parseComboPaymentReference(confirmed.externalReference);
      if (comboId === subscription.id) {
        const result = await handleComboPaymentConfirmed(
          supabase,
          toAsaasWebhookPayment({
            id: confirmed.id,
            externalReference: confirmed.externalReference,
            value: confirmed.value,
            status: confirmed.status,
            billingType: remote.billingType,
            subscription: remote.subscription,
          }),
          comboId
        );
        if (result === 'processed') return true;
      }

      const result = await handleAsaasPaymentConfirmed(
        supabase,
        toAsaasWebhookPayment({
          id: confirmed.id,
          externalReference: confirmed.externalReference,
          value: confirmed.value,
          status: confirmed.status,
          billingType: remote.billingType,
          subscription: remote.subscription,
        })
      );
      if (result === 'processed') return true;
    } catch (error) {
      console.error(
        '[asaas] reconcile local pending payment:',
        row.asaas_payment_id,
        error
      );
    }
  }

  return false;
}

async function reconcileFromRemotePayments(
  supabase: SupabaseClient,
  subscription: ReconcileAsaasSubscriptionInput,
  userId: string
): Promise<boolean> {
  const customerId = await resolveAsaasCustomerId(supabase, subscription);
  const importInput = toImportInput(
    {
      ...subscription,
      asaas_customer_id: customerId ?? subscription.asaas_customer_id,
    },
    userId
  );

  const remotePayments = await collectRemotePaymentsForSubscription(
    supabase,
    importInput
  );

  for (const payment of remotePayments) {
    if (isComboExternalReference(payment.externalReference)) {
      const subscriptionId = parseComboPaymentReference(payment.externalReference);
      if (subscriptionId !== subscription.id) continue;

      const confirmed = await resolveConfirmedInstallmentPayment({
        id: payment.id,
        status: payment.status,
        externalReference: payment.externalReference,
        installment: payment.installment,
        installmentNumber: payment.installmentNumber,
        value: payment.value,
      });
      if (!confirmed) continue;

      const result = await handleComboPaymentConfirmed(
        supabase,
        toAsaasWebhookPayment({
          id: confirmed.id,
          externalReference: confirmed.externalReference,
          value: confirmed.value,
          status: confirmed.status,
          billingType: payment.billingType,
          subscription: payment.subscription,
        }),
        subscriptionId
      );
      if (result === 'processed') return true;
      continue;
    }

    if (!isAsaasPaymentConfirmed(payment.status)) continue;

    const result = await handleAsaasPaymentConfirmed(
      supabase,
      toAsaasWebhookPayment(payment)
    );
    if (result === 'processed') return true;
  }

  return false;
}

async function findConfirmedCustomerPayment(
  subscription: ReconcileAsaasSubscriptionInput,
  customerId: string
): Promise<CustomerPayment | null> {
  const payments = await listAsaasCustomerPayments(customerId);
  for (const payment of payments) {
    if (await paymentMatchesSubscription(payment, subscription)) {
      return payment;
    }
  }
  return null;
}

async function reconcileComboCustomerPayment(
  supabase: SupabaseClient,
  subscription: ReconcileAsaasSubscriptionInput,
  payment: CustomerPayment
): Promise<boolean> {
  if (subscription.status !== 'pending') return false;

  const webhookPayment = toAsaasWebhookPayment({
    id: payment.id,
    externalReference: payment.externalReference,
    value: payment.value,
    status: payment.status,
    billingType: payment.billingType,
  });

  if (isComboExternalReference(payment.externalReference)) {
    const subscriptionId = parseComboPaymentReference(payment.externalReference);
    if (!subscriptionId) return false;

    const result = await handleComboPaymentConfirmed(
      supabase,
      webhookPayment,
      subscriptionId
    );
    return result === 'processed';
  }

  const result = await handleAsaasPaymentConfirmed(supabase, webhookPayment);
  return result === 'processed';
}

async function resolveUserId(
  supabase: SupabaseClient,
  subscription: ReconcileAsaasSubscriptionInput
): Promise<string | null> {
  if (subscription.user_id) return subscription.user_id;

  const { data } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('id', subscription.id)
    .maybeSingle();

  return data?.user_id ?? null;
}

/** Tenta ativar assinatura pendente consultando cobranças no Asaas (webhook perdido, combo, etc.). */
export async function reconcilePendingAsaasSubscription(
  supabase: SupabaseClient,
  subscription: ReconcileAsaasSubscriptionInput
): Promise<boolean> {
  if (subscription.status !== 'pending') {
    return false;
  }

  await ensureAsaasSubscriptionLink(supabase, subscription);

  if (await reconcileFromLocalApprovedPayment(supabase, subscription.id)) {
    return true;
  }

  if (await reconcileFromLocalPendingAsaasPayments(supabase, subscription)) {
    return true;
  }

  if (subscription.asaas_subscription_id) {
    const synced = await syncAsaasSubscriptionPayments(
      subscription.asaas_subscription_id
    );
    if (synced) return true;
  }

  const userId = await resolveUserId(supabase, subscription);
  if (userId) {
    const fromRemote = await reconcileFromRemotePayments(
      supabase,
      subscription,
      userId
    );
    if (fromRemote) return true;
  }

  const customerId = await resolveAsaasCustomerId(supabase, subscription);
  if (customerId) {
    const customerPayment = await findConfirmedCustomerPayment(
      subscription,
      customerId
    );
    if (
      customerPayment &&
      (await reconcileComboCustomerPayment(supabase, subscription, customerPayment))
    ) {
      return true;
    }
  }

  const isCombo =
    subscription.billing_term &&
    isComboTerm(subscription.billing_term as BillingTerm);

  if (isCombo && customerId) {
    const comboPayment = await findConfirmedComboPaymentForSubscription(
      customerId,
      subscription.id
    );

    if (comboPayment) {
      const result = await handleComboPaymentConfirmed(
        supabase,
        comboPayment,
        subscription.id
      );
      if (result === 'processed') return true;
    }
  }

  return false;
}

export async function reconcilePendingAsaasSubscriptions(
  supabase: SupabaseClient,
  subscriptions: ReconcileAsaasSubscriptionInput[],
  options: { limit?: number } = {}
): Promise<number> {
  const limit = options.limit ?? subscriptions.length;
  const pending = subscriptions
    .filter(
      (sub) =>
        sub.status === 'pending' &&
        (sub.asaas_subscription_id || sub.asaas_customer_id || sub.user_id)
    )
    .slice(0, limit);

  let activated = 0;

  for (const subscription of pending) {
    try {
      if (await reconcilePendingAsaasSubscription(supabase, subscription)) {
        activated += 1;
      }
    } catch (error) {
      console.error('[asaas] reconcile pending subscription:', subscription.id, error);
    }
  }

  return activated;
}

export async function reconcileAllPendingAsaasSubscriptions(
  supabase: SupabaseClient,
  options: { limit?: number } = {}
): Promise<number> {
  const queryLimit = options.limit ?? 200;
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select(
      'id, user_id, status, asaas_subscription_id, asaas_customer_id, billing_term'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(queryLimit);

  return reconcilePendingAsaasSubscriptions(supabase, subscriptions ?? [], {
    limit: queryLimit,
  });
}
