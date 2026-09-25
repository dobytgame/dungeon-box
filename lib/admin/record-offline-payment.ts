import type { SupabaseClient } from '@supabase/supabase-js';
import { isComboTerm } from '@/lib/checkout/combo-billing';
import { relOne } from '@/lib/dashboard/format';
import { resolveSubscriptionMonthlyRevenueCents } from '@/lib/admin/subscription-monthly-revenue';
import {
  ensureSubscriptionCycle,
  markCyclePreparing,
} from '@/lib/subscriptions/cycles';
import {
  countApprovedSubscriptionPayments,
  loyaltyLevelFromApprovedPayments,
  resolveRenewalTargetCycleNumberForSubscription,
} from '@/lib/subscriptions/monthly-production-schedule';

export const OFFLINE_PAYMENT_METHODS = ['pix', 'manual'] as const;
export type OfflinePaymentMethod = (typeof OFFLINE_PAYMENT_METHODS)[number];

const RECORDABLE_STATUSES = new Set(['past_due', 'pending']);

function isOfflinePaymentMethod(value: string): value is OfflinePaymentMethod {
  return (OFFLINE_PAYMENT_METHODS as readonly string[]).includes(value);
}

export function parseReaisToCents(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, '');
  if (!trimmed) return null;
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed;
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}

export function paidAtFromDateInput(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date.toISOString();
}

export async function recordOfflineSubscriptionPayment(
  admin: SupabaseClient,
  input: {
    subscriptionId: string;
    paidAt: string;
    amountCents: number;
    method: string;
    note?: string | null;
  }
): Promise<
  | {
      paymentId: string;
      cycleNumber: number;
      nextBillingDate: string | null;
    }
  | { error: string }
> {
  if (!isOfflinePaymentMethod(input.method)) {
    return { error: 'Informe o método (PIX ou manual).' };
  }
  if (input.amountCents <= 0) {
    return { error: 'Informe um valor válido.' };
  }

  const { data: subscription, error: loadError } = await admin
    .from('subscriptions')
    .select(
      `
      id,
      user_id,
      status,
      is_partner,
      billing_term,
      current_cycle,
      next_billing_date,
      shipping_cents,
      special_notes,
      plans!plan_id(price_cents)
    `
    )
    .eq('id', input.subscriptionId)
    .maybeSingle();

  if (loadError || !subscription) {
    return { error: 'Assinatura não encontrada.' };
  }

  if (subscription.is_partner) {
    return { error: 'Assinatura de parceiro não recebe lançamento avulso.' };
  }

  if (isComboTerm(subscription.billing_term)) {
    return {
      error: 'Combos pré-pagos não usam este lançamento. Use o fluxo de combo.',
    };
  }

  if (!RECORDABLE_STATUSES.has(subscription.status as string)) {
    return {
      error: `Só é possível lançar PIX atrasado em assinatura pendente ou em atraso. Status atual: ${subscription.status}.`,
    };
  }

  const nowIso = new Date().toISOString();
  const note = input.note?.trim() || null;

  const { data: payment, error: paymentError } = await admin
    .from('payments')
    .insert({
      user_id: subscription.user_id,
      subscription_id: subscription.id,
      amount_cents: input.amountCents,
      currency: 'BRL',
      status: 'approved',
      payment_method: input.method,
      payment_type: 'offline',
      status_detail: JSON.stringify({
        type: 'admin_offline_payment',
        source: 'admin',
        keeps_card_billing: true,
        note,
      }),
      paid_at: input.paidAt,
    })
    .select('id, amount_cents, paid_at')
    .single();

  if (paymentError || !payment) {
    console.error('[admin] recordOfflineSubscriptionPayment:', paymentError?.message);
    return { error: 'Não foi possível registrar o pagamento.' };
  }

  const cycleNumber = await resolveRenewalTargetCycleNumberForSubscription(
    admin,
    subscription.id
  );
  await ensureSubscriptionCycle(admin, subscription.id, cycleNumber);
  await markCyclePreparing(admin, subscription.id, cycleNumber, {
    id: payment.id,
    amount_cents: payment.amount_cents,
    paid_at: payment.paid_at,
  });

  const approvedPayments = await countApprovedSubscriptionPayments(
    admin,
    subscription.id
  );
  const currentCycle = Math.max(subscription.current_cycle ?? 1, cycleNumber);

  const { error: updateError } = await admin
    .from('subscriptions')
    .update({
      status: 'active',
      cancelled_at: null,
      cancel_reason: null,
      current_cycle: currentCycle,
      loyalty_level: loyaltyLevelFromApprovedPayments(approvedPayments),
      updated_at: nowIso,
    })
    .eq('id', subscription.id);

  if (updateError) {
    console.error('[admin] recordOfflineSubscriptionPayment activate:', updateError.message);
    return {
      error: 'Pagamento lançado, mas a assinatura não foi reativada. Tente ativar de novo.',
    };
  }

  return {
    paymentId: payment.id as string,
    cycleNumber,
    nextBillingDate: (subscription.next_billing_date as string | null) ?? null,
  };
}

export function defaultOfflinePaymentAmountCents(subscription: {
  shipping_cents?: number | null;
  special_notes?: string | null;
  plans?: { price_cents?: number } | { price_cents?: number }[] | null;
}): number | null {
  const plan = relOne(subscription.plans);
  return resolveSubscriptionMonthlyRevenueCents({
    planPriceCents: plan?.price_cents ?? null,
    shippingCents: subscription.shipping_cents ?? null,
    specialNotes: subscription.special_notes ?? null,
  });
}
