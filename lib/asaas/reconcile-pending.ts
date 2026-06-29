import type { SupabaseClient } from '@supabase/supabase-js';
import {
  handleComboPaymentConfirmed,
  parseComboPaymentReference,
} from '@/lib/asaas/combo-payment';
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

export type ReconcileAsaasSubscriptionInput = {
  id: string;
  status: string;
  asaas_subscription_id?: string | null;
  asaas_customer_id?: string | null;
  billing_term?: string | null;
};

type CustomerPayment = Awaited<
  ReturnType<typeof listAsaasCustomerPayments>
>[number];

function paymentMatchesSubscription(
  payment: CustomerPayment,
  subscriptionId: string
): boolean {
  if (!isAsaasPaymentConfirmed(payment.status)) return false;

  const parsedRef = parseSubscriptionExternalReference(payment.externalReference);
  if (parsedRef === subscriptionId) return true;

  const comboRef = parseComboPaymentReference(payment.externalReference);
  return comboRef === subscriptionId;
}

async function findConfirmedCustomerPayment(
  subscription: ReconcileAsaasSubscriptionInput
): Promise<CustomerPayment | null> {
  if (!subscription.asaas_customer_id) return null;

  const payments = await listAsaasCustomerPayments(subscription.asaas_customer_id);
  return (
    payments.find((payment) => paymentMatchesSubscription(payment, subscription.id)) ??
    null
  );
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

/** Tenta ativar assinatura pendente consultando cobranças no Asaas (webhook perdido, combo, etc.). */
export async function reconcilePendingAsaasSubscription(
  supabase: SupabaseClient,
  subscription: ReconcileAsaasSubscriptionInput
): Promise<boolean> {
  if (subscription.status !== 'pending') {
    return false;
  }

  if (subscription.asaas_subscription_id) {
    const synced = await syncAsaasSubscriptionPayments(
      subscription.asaas_subscription_id
    );
    if (synced) return true;
  }

  const customerPayment = await findConfirmedCustomerPayment(subscription);
  if (customerPayment) {
    const reconciled = await reconcileComboCustomerPayment(
      supabase,
      subscription,
      customerPayment
    );
    if (reconciled) return true;
  }

  const isCombo =
    subscription.billing_term &&
    isComboTerm(subscription.billing_term as BillingTerm);

  if (isCombo && subscription.asaas_customer_id) {
    const payments = await listAsaasCustomerPayments(subscription.asaas_customer_id);
    const comboPayment = payments.find(
      (payment) =>
        parseComboPaymentReference(payment.externalReference) === subscription.id &&
        isAsaasPaymentConfirmed(payment.status)
    );

    if (comboPayment) {
      const result = await handleComboPaymentConfirmed(
        supabase,
        toAsaasWebhookPayment(comboPayment),
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
  const limit = options.limit ?? 20;
  const pending = subscriptions
    .filter(
      (sub) =>
        sub.status === 'pending' &&
        (sub.asaas_subscription_id || sub.asaas_customer_id)
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
