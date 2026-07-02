import type { SupabaseClient } from '@supabase/supabase-js';
import type { BillingTerm } from '@/lib/checkout/combo-billing';
import { isComboTerm } from '@/lib/checkout/combo-billing';
import {
  isComboPrepaidPayment,
  type PaymentAmountContext,
} from '@/lib/payments/effective-amount';

export async function loadSubscriptionPaymentMaps(
  admin: SupabaseClient,
  subscriptionIds: string[]
): Promise<{
  comboBySub: Map<string, PaymentAmountContext>;
  latestBySub: Map<string, PaymentAmountContext>;
}> {
  const comboBySub = new Map<string, PaymentAmountContext>();
  const latestBySub = new Map<string, PaymentAmountContext>();

  if (subscriptionIds.length === 0) {
    return { comboBySub, latestBySub };
  }

  const { data } = await admin
    .from('payments')
    .select(
      'id, subscription_id, amount_cents, status_detail, installments, paid_at'
    )
    .in('subscription_id', subscriptionIds)
    .eq('status', 'approved')
    .order('paid_at', { ascending: false, nullsFirst: false });

  for (const payment of data ?? []) {
    const subscriptionId = payment.subscription_id as string;
    const ctx: PaymentAmountContext = {
      amount_cents: (payment.amount_cents as number) ?? 0,
      status_detail: (payment.status_detail as string | null) ?? null,
      installments: (payment.installments as number | null) ?? null,
    };

    if (!latestBySub.has(subscriptionId)) {
      latestBySub.set(subscriptionId, ctx);
    }

    if (
      isComboPrepaidPayment(ctx.status_detail) &&
      !comboBySub.has(subscriptionId)
    ) {
      comboBySub.set(subscriptionId, ctx);
    }
  }

  return { comboBySub, latestBySub };
}

export async function loadPaymentContextByIds(
  admin: SupabaseClient,
  paymentIds: string[]
): Promise<Map<string, PaymentAmountContext>> {
  const paymentsById = new Map<string, PaymentAmountContext>();

  if (paymentIds.length === 0) return paymentsById;

  const { data } = await admin
    .from('payments')
    .select('id, amount_cents, status_detail, installments')
    .in('id', paymentIds);

  for (const payment of data ?? []) {
    paymentsById.set(payment.id as string, {
      amount_cents: (payment.amount_cents as number) ?? 0,
      status_detail: (payment.status_detail as string | null) ?? null,
      installments: (payment.installments as number | null) ?? null,
    });
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
