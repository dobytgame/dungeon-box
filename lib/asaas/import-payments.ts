import type { SupabaseClient } from '@supabase/supabase-js';
import {
  listAsaasSubscriptionPayments,
  toAsaasWebhookPayment,
} from '@/lib/asaas/payment-sync';
import { isAsaasPaymentConfirmed } from '@/lib/asaas/payment-status';
import {
  normalizeAsaasSubscriptionRef,
  parseSubscriptionExternalReference,
} from '@/lib/asaas/refs';
import { listAsaasCustomerPayments, parseStoreOrderExternalReference } from '@/lib/asaas/store-order-payment';

type AsaasPaymentRow = {
  id: string;
  subscription?: string | { id?: string } | null;
  externalReference?: string | null;
  value?: number;
  status?: string;
  billingType?: string;
  paymentDate?: string | null;
};

export type ImportAsaasPaymentsInput = {
  id: string;
  user_id: string;
  asaas_subscription_id?: string | null;
  asaas_customer_id?: string | null;
  combo_total_cents?: number | null;
  combo_installments?: number | null;
  billing_term?: string | null;
};

export type ImportAsaasPaymentsResult = {
  remoteCount: number;
  upserted: number;
};

function mapAsaasPaymentStatus(
  status?: string | null
): 'approved' | 'pending' | 'refunded' | 'cancelled' {
  const normalized = status?.toUpperCase() ?? '';
  if (isAsaasPaymentConfirmed(status)) return 'approved';
  if (normalized.includes('REFUND')) return 'refunded';
  if (normalized === 'CANCELLED' || normalized === 'DELETED') return 'cancelled';
  return 'pending';
}

function paymentBelongsToSubscription(
  payment: AsaasPaymentRow,
  subscription: ImportAsaasPaymentsInput
): boolean {
  if (parseStoreOrderExternalReference(payment.externalReference)) {
    return false;
  }

  const subscriptionRef = parseSubscriptionExternalReference(
    payment.externalReference
  );
  if (subscriptionRef === subscription.id) return true;

  const asaasSubId = normalizeAsaasSubscriptionRef(payment.subscription);
  return Boolean(
    asaasSubId && asaasSubId === subscription.asaas_subscription_id
  );
}

function resolveImportAmountCents(
  payment: AsaasPaymentRow,
  subscription: ImportAsaasPaymentsInput
): number {
  const asaasCents = Math.round((payment.value ?? 0) * 100);
  const isComboRef = payment.externalReference?.endsWith(':combo');

  if (
    isComboRef &&
    subscription.combo_total_cents != null &&
    subscription.combo_total_cents > 0
  ) {
    return subscription.combo_total_cents;
  }

  return asaasCents;
}

function dedupePayments(payments: AsaasPaymentRow[]): AsaasPaymentRow[] {
  const byId = new Map<string, AsaasPaymentRow>();
  for (const payment of payments) {
    if (payment.id) byId.set(payment.id, payment);
  }
  return Array.from(byId.values());
}

async function collectRemotePayments(
  subscription: ImportAsaasPaymentsInput
): Promise<AsaasPaymentRow[]> {
  const collected: AsaasPaymentRow[] = [];

  if (subscription.asaas_subscription_id) {
    const subscriptionPayments = await listAsaasSubscriptionPayments(
      subscription.asaas_subscription_id
    );
    collected.push(...subscriptionPayments);
  }

  if (subscription.asaas_customer_id) {
    const customerPayments = await listAsaasCustomerPayments(
      subscription.asaas_customer_id
    );
    collected.push(...customerPayments);
  }

  return dedupePayments(collected).filter((payment) =>
    paymentBelongsToSubscription(payment, subscription)
  );
}

/**
 * Importa cobranças do Asaas para a tabela `payments` sem alterar status da
 * assinatura, ciclos de produção ou enviar e-mails.
 */
export async function importAsaasPaymentsForSubscription(
  supabase: SupabaseClient,
  subscription: ImportAsaasPaymentsInput
): Promise<ImportAsaasPaymentsResult> {
  const remote = await collectRemotePayments(subscription);
  let upserted = 0;

  for (const payment of remote) {
    const mapped = toAsaasWebhookPayment(payment);
    const localStatus = mapAsaasPaymentStatus(mapped.status);
    const paidAt =
      localStatus === 'approved'
        ? payment.paymentDate
          ? new Date(payment.paymentDate).toISOString()
          : new Date().toISOString()
        : null;

    const isComboRef = payment.externalReference?.endsWith(':combo');
    const installments =
      isComboRef && subscription.combo_installments
        ? subscription.combo_installments
        : 1;

    const { error } = await supabase.from('payments').upsert(
      {
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        asaas_payment_id: payment.id,
        amount_cents: resolveImportAmountCents(payment, subscription),
        currency: 'BRL',
        status: localStatus,
        paid_at: paidAt,
        installments,
        payment_method: payment.billingType?.toLowerCase() ?? null,
        status_detail: isComboRef
          ? JSON.stringify({
              type: 'combo_prepaid',
              billing_term: subscription.billing_term,
              imported_from_asaas: true,
            })
          : JSON.stringify({ imported_from_asaas: true }),
      },
      { onConflict: 'asaas_payment_id' }
    );

    if (!error) {
      upserted += 1;
    } else {
      console.error('[asaas] import payment upsert:', payment.id, error.message);
    }
  }

  return {
    remoteCount: remote.length,
    upserted,
  };
}
