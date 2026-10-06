import type { SupabaseClient } from '@supabase/supabase-js';
import { pagarmeRequest } from '@/lib/pagarme/client';
import { userFacingPagarmeError } from '@/lib/pagarme/errors';
import {
  assertPagarmeCreditCardOrderPaid,
  chargePagarmeOneTimeOrder,
  resolvePagarmeOrderChargeIds,
} from '@/lib/pagarme/one-time-order';
import { buildBillingAddress } from '@/lib/pagarme/subscription-checkout';
import {
  countApprovedSubscriptionPayments,
  loyaltyLevelFromApprovedPayments,
  resolveRenewalTargetCycleNumberForSubscription,
} from '@/lib/subscriptions/monthly-production-schedule';
import {
  ensureSubscriptionCycle,
  markCyclePreparing,
} from '@/lib/subscriptions/cycles';
import { resolveSubscriptionRecurringCharge } from '@/lib/subscriptions/recurring-charge';
import { applyPendingPlanUpgrade } from '@/lib/subscriptions/upgrade';
import { createAdminClient } from '@/lib/supabase/admin';

const UPGRADE_DETAIL_TYPE = 'plan_upgrade_activation';

export type UpgradeActivationQuote = {
  subscriptionId: string;
  amountCents: number;
  currentPlanName: string;
  targetPlanName: string;
  promoSummary: string | null;
};

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function upgradeStatusDetail(input: {
  fromPlanName: string;
  toPlanName: string;
}): string {
  return JSON.stringify({
    type: UPGRADE_DETAIL_TYPE,
    from_plan: input.fromPlanName,
    to_plan: input.toPlanName,
  });
}

export async function quotePlanUpgradeActivation(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<UpgradeActivationQuote | null> {
  const { data: subscription } = await admin
    .from('subscriptions')
    .select(
      `
      id,
      status,
      promo_code,
      shipping_cents,
      special_notes,
      plans!plan_id(name, slug, price_cents),
      pending_plan:plans!pending_plan_id(name, slug, price_cents)
    `
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription?.pending_plan) return null;
  if (subscription.status !== 'past_due') return null;

  const currentPlan = relOne(
    subscription.plans as
      | { name: string; slug: string; price_cents: number }
      | { name: string; slug: string; price_cents: number }[]
      | null
  );
  const pendingPlan = relOne(
    subscription.pending_plan as
      | { name: string; slug: string; price_cents: number }
      | { name: string; slug: string; price_cents: number }[]
      | null
  );
  if (!currentPlan || !pendingPlan) return null;

  const charge = await resolveSubscriptionRecurringCharge(admin, pendingPlan, {
    promo_code: subscription.promo_code,
    shipping_cents: subscription.shipping_cents,
    special_notes: subscription.special_notes,
  });

  if (charge.totalCents <= 0) return null;

  return {
    subscriptionId,
    amountCents: charge.totalCents,
    currentPlanName: currentPlan.name,
    targetPlanName: pendingPlan.name,
    promoSummary: charge.promoSummary,
  };
}

export async function finalizePlanUpgradeActivation(
  supabase: SupabaseClient,
  subscriptionId: string,
  payment: { id: string; amount_cents: number; paid_at: string | null }
): Promise<void> {
  await applyPendingPlanUpgrade(supabase, subscriptionId);

  const { data: existingCycle } = await supabase
    .from('subscription_cycles')
    .select('id')
    .eq('subscription_id', subscriptionId)
    .eq('payment_id', payment.id)
    .maybeSingle();

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, status, current_cycle, next_billing_date')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription) return;

  if (!existingCycle) {
    const cycleNumber = await resolveRenewalTargetCycleNumberForSubscription(
      supabase,
      subscriptionId
    );
    await ensureSubscriptionCycle(supabase, subscriptionId, cycleNumber);
    await markCyclePreparing(supabase, subscriptionId, cycleNumber, {
      id: payment.id,
      amount_cents: payment.amount_cents,
      paid_at: payment.paid_at,
    });

    const approvedPayments = await countApprovedSubscriptionPayments(
      supabase,
      subscriptionId
    );
    const currentCycle = Math.max(subscription.current_cycle ?? 1, cycleNumber);

    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        cancelled_at: null,
        cancel_reason: null,
        current_cycle: currentCycle,
        loyalty_level: loyaltyLevelFromApprovedPayments(approvedPayments),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);
    return;
  }

  if (subscription.status === 'past_due' || subscription.status === 'pending') {
    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);
  }
}

async function loadPayableSubscription(
  admin: SupabaseClient,
  subscriptionId: string,
  userId: string
) {
  const { data: subscription } = await admin
    .from('subscriptions')
    .select(
      `
      id,
      user_id,
      status,
      address_id,
      promo_code,
      shipping_cents,
      special_notes,
      card_brand,
      card_last4,
      pagarme_customer_id,
      pagarme_subscription_id,
      plans!plan_id(name),
      pending_plan:plans!pending_plan_id(name, slug, price_cents)
    `
    )
    .eq('id', subscriptionId)
    .eq('user_id', userId)
    .maybeSingle();

  return subscription;
}

type LinkedSubscriptionCard = {
  cardId: string;
  customerId: string;
  brand: string | null;
  last4: string | null;
};

async function resolveLinkedSubscriptionCard(
  subscription: {
    pagarme_subscription_id: string | null;
    pagarme_customer_id: string | null;
    card_last4: string | null;
  }
): Promise<LinkedSubscriptionCard | { error: string }> {
  const pagarmeSubscriptionId = subscription.pagarme_subscription_id?.trim() || null;
  if (!pagarmeSubscriptionId) {
    return { error: 'Esta assinatura não tem cartão vinculado para cobrança.' };
  }

  const remote = await pagarmeRequest<{
    card?: {
      id?: string | null;
      brand?: string | null;
      last_four_digits?: string | null;
    } | null;
    customer?: { id?: string | null } | null;
  }>(`/subscriptions/${encodeURIComponent(pagarmeSubscriptionId)}`);

  const cardId = remote.card?.id?.trim() || null;
  const last4 = remote.card?.last_four_digits?.trim() || null;
  const brand = remote.card?.brand?.trim() || null;
  const customerId =
    subscription.pagarme_customer_id?.trim() || remote.customer?.id?.trim() || null;
  const localLast4 = subscription.card_last4?.trim() || null;

  if (!cardId || !customerId) {
    return { error: 'Não encontramos o cartão vinculado a esta assinatura.' };
  }

  if (localLast4 && last4 && localLast4 !== last4) {
    return {
      error:
        'O cartão vinculado na assinatura não confere com o cadastro. Atualize o cartão e tente de novo.',
    };
  }

  return { cardId, customerId, brand, last4 };
}

export async function payPlanUpgradeWithLinkedCard(input: {
  userId: string;
  subscriptionId: string;
}): Promise<{ success: true; targetPlanName: string } | { error: string }> {
  const admin = createAdminClient();
  const quote = await quotePlanUpgradeActivation(admin, input.subscriptionId);
  if (!quote) {
    return { error: 'Não há upgrade aguardando pagamento nesta assinatura.' };
  }

  const subscription = await loadPayableSubscription(
    admin,
    input.subscriptionId,
    input.userId
  );
  if (!subscription) return { error: 'Assinatura não encontrada.' };

  const { data: address } = await admin
    .from('addresses')
    .select('recipient, zip_code, street, number, complement, neighborhood, city, state')
    .eq('id', subscription.address_id)
    .maybeSingle();

  if (!address) {
    return { error: 'Assinatura sem endereço para cobrar o cartão vinculado.' };
  }

  let linkedCard: LinkedSubscriptionCard;
  try {
    const resolved = await resolveLinkedSubscriptionCard(subscription);
    if ('error' in resolved) return resolved;
    linkedCard = resolved;
  } catch (error) {
    return { error: userFacingPagarmeError(error) };
  }

  let order;
  try {
    order = await chargePagarmeOneTimeOrder({
      customerId: linkedCard.customerId,
      valueCents: quote.amountCents,
      description: `DungeonBox — ativar upgrade ${quote.targetPlanName}`,
      billingAddress: buildBillingAddress(address),
      orderCode: `${input.subscriptionId}-plan-upgrade-${Date.now().toString(36)}`,
      cardId: linkedCard.cardId,
      metadata: {
        subscription_id: input.subscriptionId,
        charge_kind: 'plan_upgrade',
      },
    });
    assertPagarmeCreditCardOrderPaid(
      order,
      'Pagamento recusado. Verifique os dados do cartão e tente novamente.'
    );
  } catch (error) {
    return { error: userFacingPagarmeError(error) };
  }

  const ids = resolvePagarmeOrderChargeIds(order);
  if (!ids.chargeId) {
    return { error: 'Pagamento aprovado, mas a cobrança não foi identificada.' };
  }

  const now = new Date().toISOString();
  const { data: paymentRow, error: paymentError } = await admin
    .from('payments')
    .upsert(
      {
        user_id: input.userId,
        subscription_id: input.subscriptionId,
        pagarme_order_id: ids.orderId,
        pagarme_charge_id: ids.chargeId,
        amount_cents: quote.amountCents,
        currency: 'BRL',
        status: 'approved',
        paid_at: now,
        payment_method: 'credit_card',
        card_brand: linkedCard.brand,
        card_last4: linkedCard.last4,
        installments: 1,
        status_detail: upgradeStatusDetail({
          fromPlanName: quote.currentPlanName,
          toPlanName: quote.targetPlanName,
        }),
      },
      { onConflict: 'pagarme_charge_id' }
    )
    .select('id, amount_cents, paid_at')
    .single();

  if (paymentError || !paymentRow) {
    return { error: 'Pagamento aprovado, mas não foi possível registrar a ativação.' };
  }

  await finalizePlanUpgradeActivation(admin, input.subscriptionId, {
    id: paymentRow.id as string,
    amount_cents: paymentRow.amount_cents as number,
    paid_at: (paymentRow.paid_at as string | null) ?? now,
  });

  return { success: true, targetPlanName: quote.targetPlanName };
}
