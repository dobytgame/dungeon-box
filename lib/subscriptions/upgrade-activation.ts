import type { SupabaseClient } from '@supabase/supabase-js';
import { userFacingPagarmeError } from '@/lib/pagarme/errors';
import { getOrCreatePagarmeCustomer } from '@/lib/pagarme/customer';
import {
  assertPagarmeCreditCardOrderPaid,
  chargePagarmeOneTimeOrder,
  extractPagarmeStorePix,
  fetchPagarmeOrder,
  isPagarmeChargePaid,
  resolvePagarmeOrderChargeIds,
} from '@/lib/pagarme/one-time-order';
import {
  CHECKOUT_COMBO_PIX_EXPIRES_IN_SECONDS,
  createPagarmeSubscriptionPixPayment,
} from '@/lib/pagarme/subscription-pix';
import type { PagarmeBillingAddressInput } from '@/lib/pagarme/subscription-card-payload';
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

function isUpgradePaymentDetail(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as { type?: string };
    return parsed.type === UPGRADE_DETAIL_TYPE;
  } catch {
    return raw.includes(UPGRADE_DETAIL_TYPE);
  }
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
      pagarme_customer_id,
      plans!plan_id(name),
      pending_plan:plans!pending_plan_id(name, slug, price_cents)
    `
    )
    .eq('id', subscriptionId)
    .eq('user_id', userId)
    .maybeSingle();

  return subscription;
}

export async function startPlanUpgradePixPayment(input: {
  userId: string;
  subscriptionId: string;
}): Promise<
  | {
      alreadyPaid: boolean;
      amountCents: number;
      targetPlanName: string;
      pix: { payload: string; expirationDate: string; imageUrl?: string; encodedImage?: string };
    }
  | { error: string }
> {
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

  const reusable = await reuseOpenUpgradePix(
    admin,
    input.subscriptionId,
    quote.amountCents
  );
  if (reusable) {
    if (reusable.alreadyPaid && reusable.paymentId) {
      await finalizePlanUpgradeActivation(admin, input.subscriptionId, {
        id: reusable.paymentId,
        amount_cents: quote.amountCents,
        paid_at: new Date().toISOString(),
      });
    }
    return {
      alreadyPaid: reusable.alreadyPaid,
      amountCents: quote.amountCents,
      targetPlanName: quote.targetPlanName,
      pix: reusable.pix,
    };
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, full_name, cpf, phone, pagarme_customer_id')
    .eq('id', input.userId)
    .maybeSingle();

  const { data: address } = await admin
    .from('addresses')
    .select('recipient, zip_code, street, number, complement, neighborhood, city, state')
    .eq('id', subscription.address_id)
    .maybeSingle();

  if (!profile?.email || !address) {
    return { error: 'Cadastro incompleto para gerar o PIX.' };
  }

  const customerId = await getOrCreatePagarmeCustomer(admin, profile, address);

  let pixCharge;
  try {
    pixCharge = await createPagarmeSubscriptionPixPayment(admin, {
      customerId,
      userId: input.userId,
      subscriptionId: input.subscriptionId,
      valueCents: quote.amountCents,
      description: `DungeonBox — ativar upgrade ${quote.targetPlanName}`,
      chargeKind: 'plan_upgrade',
      statusDetail: upgradeStatusDetail({
        fromPlanName: quote.currentPlanName,
        toPlanName: quote.targetPlanName,
      }),
      expiresInSeconds: CHECKOUT_COMBO_PIX_EXPIRES_IN_SECONDS,
    });
  } catch (error) {
    return { error: userFacingPagarmeError(error) };
  }

  if (pixCharge.alreadyPaid) {
    await finalizePlanUpgradeActivation(admin, input.subscriptionId, {
      id: pixCharge.paymentId,
      amount_cents: quote.amountCents,
      paid_at: new Date().toISOString(),
    });
  }

  return {
    alreadyPaid: pixCharge.alreadyPaid,
    amountCents: quote.amountCents,
    targetPlanName: quote.targetPlanName,
    pix: pixCharge.pix,
  };
}

export async function payPlanUpgradeWithCard(input: {
  userId: string;
  subscriptionId: string;
  cardToken: string;
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

  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, full_name, cpf, phone, pagarme_customer_id')
    .eq('id', input.userId)
    .maybeSingle();

  const { data: address } = await admin
    .from('addresses')
    .select('recipient, zip_code, street, number, complement, neighborhood, city, state')
    .eq('id', subscription.address_id)
    .maybeSingle();

  if (!profile?.email || !address) {
    return { error: 'Cadastro incompleto para cobrar o cartão.' };
  }

  const customerId = await getOrCreatePagarmeCustomer(admin, profile, address);
  const billingAddress: PagarmeBillingAddressInput = {
    line_1: `${address.number}, ${address.street}, ${address.neighborhood}`,
    line_2: address.complement ?? undefined,
    zip_code: address.zip_code.replace(/\D/g, ''),
    city: address.city,
    state: address.state,
    country: 'BR',
  };

  let order;
  try {
    order = await chargePagarmeOneTimeOrder({
      customerId,
      valueCents: quote.amountCents,
      description: `DungeonBox — ativar upgrade ${quote.targetPlanName}`,
      billingAddress,
      orderCode: `${input.subscriptionId}-plan-upgrade-${Date.now().toString(36)}`,
      cardToken: input.cardToken,
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

export async function syncPlanUpgradePixPayment(input: {
  userId: string;
  subscriptionId: string;
}): Promise<'active' | 'pending'> {
  const admin = createAdminClient();
  const { data: subscription } = await admin
    .from('subscriptions')
    .select('id, status, pending_plan_id')
    .eq('id', input.subscriptionId)
    .eq('user_id', input.userId)
    .maybeSingle();

  if (!subscription) return 'pending';
  if (subscription.status === 'active' && !subscription.pending_plan_id) {
    return 'active';
  }

  const { data: payment } = await admin
    .from('payments')
    .select('id, amount_cents, paid_at, status, status_detail, pagarme_order_id')
    .eq('subscription_id', input.subscriptionId)
    .eq('payment_method', 'pix')
    .order('created_at', { ascending: false })
    .limit(8);

  const upgradePayment = (payment ?? []).find((row) =>
    isUpgradePaymentDetail(row.status_detail as string | null)
  );
  if (!upgradePayment?.pagarme_order_id) return 'pending';

  if (upgradePayment.status === 'approved') {
    await finalizePlanUpgradeActivation(admin, input.subscriptionId, {
      id: upgradePayment.id as string,
      amount_cents: upgradePayment.amount_cents as number,
      paid_at: (upgradePayment.paid_at as string | null) ?? new Date().toISOString(),
    });
    return 'active';
  }

  try {
    const order = await fetchPagarmeOrder(upgradePayment.pagarme_order_id as string);
    const ids = resolvePagarmeOrderChargeIds(order);
    if (!ids.chargeId || !isPagarmeChargePaid(ids.chargeStatus)) return 'pending';

    const paidAt = new Date().toISOString();
    await admin
      .from('payments')
      .update({ status: 'approved', paid_at: paidAt })
      .eq('id', upgradePayment.id);

    await finalizePlanUpgradeActivation(admin, input.subscriptionId, {
      id: upgradePayment.id as string,
      amount_cents: upgradePayment.amount_cents as number,
      paid_at: paidAt,
    });
    return 'active';
  } catch (error) {
    console.error('[upgrade] sync activation pix:', input.subscriptionId, error);
    return 'pending';
  }
}

async function reuseOpenUpgradePix(
  admin: SupabaseClient,
  subscriptionId: string,
  amountCents: number
): Promise<{
  alreadyPaid: boolean;
  paymentId: string | null;
  pix: { payload: string; expirationDate: string; imageUrl?: string };
} | null> {
  const { data: rows } = await admin
    .from('payments')
    .select('id, amount_cents, status, status_detail, pagarme_order_id')
    .eq('subscription_id', subscriptionId)
    .eq('payment_method', 'pix')
    .eq('amount_cents', amountCents)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);

  const row = (rows ?? []).find((item) =>
    isUpgradePaymentDetail(item.status_detail as string | null)
  );
  if (!row?.pagarme_order_id) return null;

  try {
    const order = await fetchPagarmeOrder(row.pagarme_order_id as string);
    const ids = resolvePagarmeOrderChargeIds(order);
    if (ids.chargeId && isPagarmeChargePaid(ids.chargeStatus)) {
      return {
        alreadyPaid: true,
        paymentId: row.id as string,
        pix: { payload: '', expirationDate: '' },
      };
    }

    const pix = extractPagarmeStorePix(order);
    if (!pix?.payload?.trim()) return null;
    if (pix.expirationDate) {
      const expiresAt = new Date(pix.expirationDate).getTime();
      if (Number.isFinite(expiresAt) && expiresAt < Date.now() + 60_000) return null;
    }
    return { alreadyPaid: false, paymentId: row.id as string, pix };
  } catch {
    return null;
  }
}
