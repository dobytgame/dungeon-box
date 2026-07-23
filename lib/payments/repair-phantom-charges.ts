import type { SupabaseClient } from '@supabase/supabase-js';
import { AsaasApiError } from '@/lib/asaas/client';
import { fetchAsaasPaymentDetails } from '@/lib/asaas/payment-details';
import { isAsaasPaymentConfirmed } from '@/lib/asaas/payment-status';
import {
  buildRevenueCountIndexes,
  buildCanonicalComboPrepaidIndex,
  isComboSubscription,
  type RevenuePaymentRow,
  type SubscriptionRevenueContext,
} from '@/lib/payments/revenue-aggregation';

type PaymentRow = {
  id: string;
  subscription_id: string | null;
  asaas_payment_id: string | null;
  amount_cents: number;
  paid_at: string | null;
  created_at: string | null;
  status_detail: string | null;
  subscriptions?: unknown;
};

function paymentTimestamp(row: PaymentRow): string {
  return row.paid_at ?? row.created_at ?? '';
}

function paymentMonthKey(row: PaymentRow): string | null {
  const timestamp = paymentTimestamp(row);
  if (!row.subscription_id || !timestamp) return null;
  return `${row.subscription_id}:${timestamp.slice(0, 7)}`;
}

function isPhantomDetail(statusDetail: string | null): boolean {
  if (!statusDetail) return false;
  return (
    statusDetail.includes('phantom_duplicate_import') ||
    statusDetail.includes('phantom_unconfirmed_asaas') ||
    statusDetail.includes('phantom_missing_asaas') ||
    statusDetail.includes('cancelled_future_charge') ||
    statusDetail.includes('combo_installment_slice')
  );
}

async function cancelPhantomApprovedPayment(
  admin: SupabaseClient,
  paymentId: string,
  detail: Record<string, unknown>
): Promise<boolean> {
  const { error: updateError } = await admin
    .from('payments')
    .update({
      status: 'cancelled',
      status_detail: JSON.stringify({
        ...detail,
        repaired_at: new Date().toISOString(),
      }),
    })
    .eq('id', paymentId);

  return !updateError;
}

/** Cancela cobranças duplicadas no mesmo mês/assinatura (fantasmas de import Asaas). */
export async function cancelPhantomSubscriptionCharges(
  admin: SupabaseClient,
  subscriptionId?: string
): Promise<{ cancelled: number }> {
  let query = admin
    .from('payments')
    .select(
      `
      id,
      subscription_id,
      asaas_payment_id,
      amount_cents,
      paid_at,
      created_at,
      status_detail,
      subscriptions(
        billing_term,
        combo_total_cents,
        combo_installments,
        prepaid_months,
        prepaid_until,
        started_at
      )
    `
    )
    .eq('status', 'approved')
    .not('subscription_id', 'is', null);

  if (subscriptionId) {
    query = query.eq('subscription_id', subscriptionId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[payments] cancelPhantomSubscriptionCharges:', error.message);
    return { cancelled: 0 };
  }

  const payments = (data ?? []) as PaymentRow[];
  const revenueRows = payments as unknown as RevenuePaymentRow[];
  const indexes = buildRevenueCountIndexes(revenueRows);
  const canonicalCombo = indexes.canonicalComboBySubscription;

  const byMonth = new Map<string, PaymentRow[]>();
  let cancelled = 0;

  for (const payment of payments) {
    if (isPhantomDetail(payment.status_detail)) continue;

    const subscription = (Array.isArray(payment.subscriptions)
      ? payment.subscriptions[0]
      : payment.subscriptions) as SubscriptionRevenueContext | null;

    if (
      payment.subscription_id &&
      isComboSubscription(subscription)
    ) {
      const canonicalId = canonicalCombo.get(payment.subscription_id);
      if (canonicalId && payment.id !== canonicalId) {
        const { error: updateError } = await admin
          .from('payments')
          .update({
            status: 'cancelled',
            status_detail: JSON.stringify({
              type: 'phantom_duplicate_import',
              reason: 'combo_recurring_charge',
              repaired_at: new Date().toISOString(),
            }),
          })
          .eq('id', payment.id);

        if (!updateError) cancelled += 1;
        continue;
      }
    }

    const firstId = payment.subscription_id
      ? indexes.firstPaymentBySubscription.get(payment.subscription_id)
      : undefined;
    if (
      payment.subscription_id &&
      firstId &&
      payment.id !== firstId &&
      subscription?.prepaid_until
    ) {
      const prepaidUntil = new Date(subscription.prepaid_until);
      const paidAt = payment.paid_at ?? payment.created_at;
      if (
        paidAt &&
        !Number.isNaN(prepaidUntil.getTime()) &&
        new Date(paidAt).getTime() <= prepaidUntil.getTime()
      ) {
        const { error: updateError } = await admin
          .from('payments')
          .update({
            status: 'cancelled',
            status_detail: JSON.stringify({
              type: 'phantom_duplicate_import',
              reason: 'prepaid_period_renewal',
              repaired_at: new Date().toISOString(),
            }),
          })
          .eq('id', payment.id);

        if (!updateError) cancelled += 1;
        continue;
      }
    }

    const monthKey = paymentMonthKey(payment);
    if (!monthKey) continue;
    const bucket = byMonth.get(monthKey) ?? [];
    bucket.push(payment);
    byMonth.set(monthKey, bucket);
  }

  for (const rows of Array.from(byMonth.values())) {
    if (rows.length <= 1) continue;

    const sorted = [...rows].sort((a, b) => {
      const cmp = paymentTimestamp(a).localeCompare(paymentTimestamp(b));
      if (cmp !== 0) return cmp;
      return a.id.localeCompare(b.id);
    });

    for (const duplicate of sorted.slice(1)) {
      const { error: updateError } = await admin
        .from('payments')
        .update({
          status: 'cancelled',
          status_detail: JSON.stringify({
            type: 'phantom_duplicate_import',
            reason: 'duplicate_same_month',
            repaired_at: new Date().toISOString(),
          }),
        })
        .eq('id', duplicate.id);

      if (!updateError) cancelled += 1;
    }
  }

  return { cancelled };
}

/** Rebaixa aprovados locais cujo Asaas ainda está pendente/não confirmado. */
export async function reconcileApprovedPaymentsWithAsaas(
  admin: SupabaseClient,
  subscriptionId?: string
): Promise<{ cancelled: number }> {
  let query = admin
    .from('payments')
    .select('id, asaas_payment_id, status_detail')
    .eq('status', 'approved')
    .not('asaas_payment_id', 'is', null);

  if (subscriptionId) {
    query = query.eq('subscription_id', subscriptionId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[payments] reconcileApprovedPaymentsWithAsaas:', error.message);
    return { cancelled: 0 };
  }

  let cancelled = 0;

  for (const payment of data ?? []) {
    if (isPhantomDetail(payment.status_detail as string | null)) continue;

    const asaasPaymentId = payment.asaas_payment_id as string;
    try {
      const remote = await fetchAsaasPaymentDetails(asaasPaymentId);
      if (isAsaasPaymentConfirmed(remote.status)) continue;

      if (
        await cancelPhantomApprovedPayment(admin, payment.id as string, {
          type: 'phantom_unconfirmed_asaas',
          asaas_status: remote.status ?? 'unknown',
        })
      ) {
        cancelled += 1;
      }
    } catch (err) {
      if (err instanceof AsaasApiError && err.status === 404) {
        if (
          await cancelPhantomApprovedPayment(admin, payment.id as string, {
            type: 'phantom_missing_asaas',
            asaas_payment_id: asaasPaymentId,
          })
        ) {
          cancelled += 1;
        }
        continue;
      }

      console.warn(
        '[payments] reconcileApprovedPaymentsWithAsaas:',
        asaasPaymentId,
        err
      );
    }
  }

  return { cancelled };
}

export async function repairPhantomSubscriptionCharges(
  admin: SupabaseClient,
  subscriptionId?: string
): Promise<{ asaasReconciled: number; duplicatesCancelled: number }> {
  const asaasReconciled = (
    await reconcileApprovedPaymentsWithAsaas(admin, subscriptionId)
  ).cancelled;
  const duplicatesCancelled = (
    await cancelPhantomSubscriptionCharges(admin, subscriptionId)
  ).cancelled;

  return { asaasReconciled, duplicatesCancelled };
}
