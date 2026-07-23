import type { SupabaseClient } from '@supabase/supabase-js';
import {
  listAsaasSubscriptionPayments,
  toAsaasWebhookPayment,
} from '@/lib/asaas/payment-sync';
import { isAsaasPaymentConfirmed } from '@/lib/asaas/payment-status';
import { isAsaasPaymentPending } from '@/lib/asaas/payment-details';
import { resolveConfirmedInstallmentPayment } from '@/lib/asaas/installment-payments';
import {
  normalizeAsaasSubscriptionRef,
  parseSubscriptionExternalReference,
} from '@/lib/asaas/refs';
import {
  backfillAsaasSubscriptionId,
  paymentBelongsToLocalSubscription,
} from '@/lib/asaas/subscription-link';
import { listAsaasCustomerPayments, parseStoreOrderExternalReference } from '@/lib/asaas/store-order-payment';
import { isComboInstallmentSlicePayment, isComboPrepaidPayment } from '@/lib/payments/effective-amount';
import { findCanonicalComboPrepaidPayment } from '@/lib/payments/combo-payment-queries';

type AsaasPaymentRow = {
  id: string;
  subscription?: string | { id?: string } | null;
  externalReference?: string | null;
  value?: number;
  status?: string;
  billingType?: string;
  paymentDate?: string | null;
  dueDate?: string | null;
  installment?: string | null;
  installmentNumber?: number | null;
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

function isComboInitialCharge(payment: AsaasPaymentRow): boolean {
  if (!payment.externalReference?.endsWith(':combo')) return false;
  const installmentNumber = payment.installmentNumber;
  return installmentNumber == null || installmentNumber <= 1;
}

function dedupePayments(payments: AsaasPaymentRow[]): AsaasPaymentRow[] {
  const byId = new Map<string, AsaasPaymentRow>();
  for (const payment of payments) {
    if (payment.id) byId.set(payment.id, payment);
  }
  return Array.from(byId.values());
}

async function collectRemotePayments(
  supabase: SupabaseClient,
  subscription: ImportAsaasPaymentsInput
): Promise<AsaasPaymentRow[]> {
  const collected: AsaasPaymentRow[] = [];
  let asaasSubscriptionId = subscription.asaas_subscription_id ?? null;

  let customerPayments: AsaasPaymentRow[] = [];
  if (subscription.asaas_customer_id) {
    customerPayments = await listAsaasCustomerPayments(
      subscription.asaas_customer_id
    );
    collected.push(...customerPayments);

    if (!asaasSubscriptionId) {
      asaasSubscriptionId = await backfillAsaasSubscriptionId(
        supabase,
        subscription,
        customerPayments
      );
    }
  }

  if (asaasSubscriptionId) {
    const subscriptionPayments = await listAsaasSubscriptionPayments(
      asaasSubscriptionId
    );
    collected.push(...subscriptionPayments);
  }

  const subscriptionWithLink: ImportAsaasPaymentsInput = {
    ...subscription,
    asaas_subscription_id: asaasSubscriptionId ?? subscription.asaas_subscription_id,
  };

  const matched: AsaasPaymentRow[] = [];
  for (const payment of dedupePayments(collected)) {
    if (paymentBelongsToSubscription(payment, subscriptionWithLink)) {
      matched.push(payment);
      continue;
    }
    if (await paymentBelongsToLocalSubscription(payment, subscriptionWithLink)) {
      matched.push(payment);
    }
  }

  return matched;
}

export async function collectRemotePaymentsForSubscription(
  supabase: SupabaseClient,
  subscription: ImportAsaasPaymentsInput
): Promise<AsaasPaymentRow[]> {
  return collectRemotePayments(supabase, subscription);
}

/**
 * Importa cobranças do Asaas para a tabela `payments` sem alterar status da
 * assinatura, ciclos de produção ou enviar e-mails.
 */
function isFutureUnconfirmedCharge(payment: AsaasPaymentRow): boolean {
  if (isAsaasPaymentConfirmed(payment.status)) return false;
  if (!payment.dueDate) return false;

  const due = new Date(`${payment.dueDate}T23:59:59`);
  if (Number.isNaN(due.getTime())) return false;

  return due.getTime() > Date.now();
}

export async function importAsaasPaymentsForSubscription(
  supabase: SupabaseClient,
  subscription: ImportAsaasPaymentsInput
): Promise<ImportAsaasPaymentsResult> {
  const remote = await collectRemotePayments(supabase, subscription);
  let upserted = 0;

  for (const payment of remote) {
    if (isFutureUnconfirmedCharge(payment)) {
      continue;
    }

    const isComboRef = payment.externalReference?.endsWith(':combo');
    const resolved = isComboRef
      ? await resolveConfirmedInstallmentPayment({
          id: payment.id,
          status: payment.status,
          externalReference: payment.externalReference,
          installment: payment.installment,
          installmentNumber: payment.installmentNumber,
          value: payment.value,
        })
      : null;

    const effectivePayment = resolved ?? payment;
    const isComboInitial = isComboRef && isComboInitialCharge(effectivePayment);
    const isComboSlice = isComboRef && !isComboInitial;

    const mapped = toAsaasWebhookPayment(effectivePayment);
    let localStatus = mapAsaasPaymentStatus(mapped.status);
    if (isAsaasPaymentPending(mapped.status)) {
      localStatus = 'pending';
    }
    const paidAt =
      localStatus === 'approved'
        ? effectivePayment.paymentDate
          ? new Date(effectivePayment.paymentDate).toISOString()
          : new Date().toISOString()
        : null;

    const installments =
      isComboInitial && subscription.combo_installments
        ? subscription.combo_installments
        : 1;

    const amountCents = isComboInitial
      ? resolveImportAmountCents(effectivePayment, subscription)
      : Math.round((effectivePayment.value ?? 0) * 100);

    const { data: existing } = await supabase
      .from('payments')
      .select('status_detail, asaas_payment_id')
      .eq('asaas_payment_id', effectivePayment.id)
      .maybeSingle();

    const existingComboPrepaid = await findCanonicalComboPrepaidPayment(
      supabase,
      subscription.id
    );

    let forceComboSlice = false;
    if (
      isComboInitial &&
      existingComboPrepaid &&
      existingComboPrepaid.asaas_payment_id !== effectivePayment.id
    ) {
      forceComboSlice = true;
    }

    if (
      existing?.status_detail &&
      (existing.status_detail as string).includes('combo_installment_slice')
    ) {
      continue;
    }

    if (
      isComboInitial &&
      !forceComboSlice &&
      existing?.status_detail &&
      isComboPrepaidPayment(existing.status_detail as string) &&
      !(existing.status_detail as string).includes('combo_installment_slice')
    ) {
      continue;
    }

    const treatAsComboSlice = isComboSlice || forceComboSlice;
    const parcelAmountCents = Math.round((effectivePayment.value ?? 0) * 100);

    if (
      treatAsComboSlice &&
      isComboInstallmentSlicePayment(
        { amount_cents: parcelAmountCents, status_detail: null },
        {
          billing_term: subscription.billing_term,
          combo_total_cents: subscription.combo_total_cents,
          combo_installments: subscription.combo_installments,
        }
      ) &&
      localStatus !== 'approved'
    ) {
      continue;
    }

    const comboTotalCents = subscription.combo_total_cents ?? amountCents;
    const statusDetail = treatAsComboSlice
      ? JSON.stringify({
          type: 'combo_installment_slice',
          imported_from_asaas: true,
        })
      : isComboInitial
        ? JSON.stringify({
            type: 'combo_prepaid',
            billing_term: subscription.billing_term,
            combo_total_cents: comboTotalCents,
            combo_installments:
              subscription.combo_installments && subscription.combo_installments > 1
                ? subscription.combo_installments
                : undefined,
            imported_from_asaas: true,
          })
        : JSON.stringify({ imported_from_asaas: true });

    const resolvedAmountCents = treatAsComboSlice ? parcelAmountCents : amountCents;

    const { error } = await supabase.from('payments').upsert(
      {
        user_id: subscription.user_id,
        subscription_id: subscription.id,
        asaas_payment_id: effectivePayment.id,
        amount_cents: resolvedAmountCents,
        currency: 'BRL',
        status: localStatus,
        paid_at: paidAt,
        installments: treatAsComboSlice ? 1 : installments,
        payment_method: payment.billingType?.toLowerCase() ?? null,
        status_detail: statusDetail,
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
