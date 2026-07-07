import type { SupabaseClient } from '@supabase/supabase-js';
import type { BillingTerm } from '@/lib/checkout/combo-billing';
import { isComboTerm } from '@/lib/checkout/combo-billing';
import {
  isComboPrepaidPayment,
  type PaymentAmountContext,
} from '@/lib/payments/effective-amount';

export type SubscriptionPaymentRecord = PaymentAmountContext & {
  id: string;
  paid_at: string | null;
  created_at?: string | null;
};

function paymentRecordedAt(
  paidAt: string | null | undefined,
  createdAt?: string | null
): string | null {
  return paidAt ?? createdAt ?? null;
}

function earliestRecordedAt(
  ...values: (string | null | undefined)[]
): string | null {
  const valid = values.filter((value): value is string => Boolean(value));
  if (valid.length === 0) return null;
  return valid.sort((a, b) => a.localeCompare(b))[0]!;
}

function toPaymentRecord(payment: {
  id: string;
  amount_cents: number | null;
  status_detail: string | null;
  installments: number | null;
  paid_at: string | null;
  created_at?: string | null;
}): SubscriptionPaymentRecord {
  return {
    id: payment.id,
    paid_at: payment.paid_at,
    created_at: payment.created_at ?? null,
    amount_cents: payment.amount_cents ?? 0,
    status_detail: payment.status_detail,
    installments: payment.installments,
  };
}

export async function loadSubscriptionPaymentMaps(
  admin: SupabaseClient,
  subscriptionIds: string[]
): Promise<{
  comboBySub: Map<string, SubscriptionPaymentRecord>;
  latestBySub: Map<string, SubscriptionPaymentRecord>;
  firstApprovedBySub: Map<string, SubscriptionPaymentRecord>;
}> {
  const comboBySub = new Map<string, SubscriptionPaymentRecord>();
  const latestBySub = new Map<string, SubscriptionPaymentRecord>();
  const firstApprovedBySub = new Map<string, SubscriptionPaymentRecord>();

  if (subscriptionIds.length === 0) {
    return { comboBySub, latestBySub, firstApprovedBySub };
  }

  const { data } = await admin
    .from('payments')
    .select(
      'id, subscription_id, amount_cents, status_detail, installments, paid_at, created_at'
    )
    .in('subscription_id', subscriptionIds)
    .eq('status', 'approved')
    .order('paid_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  for (const payment of data ?? []) {
    const subscriptionId = payment.subscription_id as string;
    const record = toPaymentRecord({
      id: payment.id as string,
      amount_cents: payment.amount_cents as number | null,
      status_detail: payment.status_detail as string | null,
      installments: payment.installments as number | null,
      paid_at: payment.paid_at as string | null,
      created_at: payment.created_at as string | null,
    });

    const existingFirst = firstApprovedBySub.get(subscriptionId);
    const recordAt = paymentRecordedAt(record.paid_at, record.created_at);
    const existingAt = existingFirst
      ? paymentRecordedAt(existingFirst.paid_at, existingFirst.created_at)
      : null;

    if (
      !existingFirst ||
      (recordAt && (!existingAt || recordAt < existingAt))
    ) {
      firstApprovedBySub.set(subscriptionId, record);
    }

    latestBySub.set(subscriptionId, record);

    if (
      isComboPrepaidPayment(record.status_detail) &&
      !comboBySub.has(subscriptionId)
    ) {
      comboBySub.set(subscriptionId, record);
    }
  }

  return { comboBySub, latestBySub, firstApprovedBySub };
}

export async function loadPaymentContextByIds(
  admin: SupabaseClient,
  paymentIds: string[]
): Promise<Map<string, SubscriptionPaymentRecord>> {
  const paymentsById = new Map<string, SubscriptionPaymentRecord>();

  if (paymentIds.length === 0) return paymentsById;

  const { data } = await admin
    .from('payments')
    .select('id, amount_cents, status_detail, installments, paid_at, created_at')
    .in('id', paymentIds);

  for (const payment of data ?? []) {
    paymentsById.set(
      payment.id as string,
      toPaymentRecord({
        id: payment.id as string,
        amount_cents: payment.amount_cents as number | null,
        status_detail: payment.status_detail as string | null,
        installments: payment.installments as number | null,
        paid_at: payment.paid_at as string | null,
        created_at: payment.created_at as string | null,
      })
    );
  }

  return paymentsById;
}

export function pickCyclePaymentContext(input: {
  paymentId: string | null;
  amountCents: number | null;
  subscriptionId: string;
  billingTerm: string | null;
  linkedPayment: PaymentAmountContext | null;
  comboBySub: Map<string, PaymentAmountContext>;
  latestBySub: Map<string, PaymentAmountContext>;
}): PaymentAmountContext | null {
  let payment = input.linkedPayment;

  if (!payment || input.amountCents == null) {
    payment = input.comboBySub.get(input.subscriptionId) ?? payment;
  }

  if (
    (!payment || input.amountCents == null) &&
    input.billingTerm &&
    isComboTerm(input.billingTerm as BillingTerm)
  ) {
    payment = input.comboBySub.get(input.subscriptionId) ?? payment;
  }

  if (!payment && input.amountCents == null) {
    payment = input.latestBySub.get(input.subscriptionId) ?? null;
  }

  return payment;
}

export function resolveCycleEffectivePaidAt(input: {
  cycleNumber: number;
  cyclePaidAt: string | null;
  paymentId: string | null;
  billingTerm: string | null;
  linkedPaymentPaidAt?: string | null;
  linkedPaymentCreatedAt?: string | null;
  comboPaymentPaidAt?: string | null;
  comboPaymentCreatedAt?: string | null;
  firstApprovedPaymentPaidAt?: string | null;
  firstApprovedPaymentCreatedAt?: string | null;
  subscriptionStartedAt?: string | null;
}): string | null {
  if (input.cycleNumber === 1) {
    return earliestRecordedAt(
      paymentRecordedAt(
        input.firstApprovedPaymentPaidAt,
        input.firstApprovedPaymentCreatedAt
      ),
      paymentRecordedAt(
        input.comboPaymentPaidAt,
        input.comboPaymentCreatedAt
      ),
      input.subscriptionStartedAt,
      input.cyclePaidAt,
      paymentRecordedAt(
        input.linkedPaymentPaidAt,
        input.linkedPaymentCreatedAt
      )
    );
  }

  if (input.cyclePaidAt) return input.cyclePaidAt;

  if (
    input.billingTerm &&
    isComboTerm(input.billingTerm as BillingTerm) &&
    input.cycleNumber > 1 &&
    input.paymentId
  ) {
    return earliestRecordedAt(
      input.comboPaymentPaidAt,
      input.firstApprovedPaymentPaidAt
    );
  }

  return paymentRecordedAt(
    input.linkedPaymentPaidAt,
    input.linkedPaymentCreatedAt
  );
}
