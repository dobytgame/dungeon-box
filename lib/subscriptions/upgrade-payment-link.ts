import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSiteUrl } from '@/lib/email/config';
import { pagarmeRequest } from '@/lib/pagarme/client';
import { userFacingPagarmeError } from '@/lib/pagarme/errors';
import {
  assertPagarmeCreditCardOrderPaid,
  chargePagarmeOneTimeOrder,
  resolvePagarmeOrderCardId,
  resolvePagarmeOrderChargeIds,
} from '@/lib/pagarme/one-time-order';
import { buildBillingAddress } from '@/lib/pagarme/subscription-checkout';
import { updatePagarmeSubscriptionCard } from '@/lib/pagarme/subscription-api';
import { buildPagarmeSubscriptionPlanUpgradeCode } from '@/lib/pagarme/store-order-code';
import {
  finalizePlanUpgradeActivation,
  quotePlanUpgradeActivation,
} from '@/lib/subscriptions/upgrade-activation';

const LINK_DAYS = 7;

export type UpgradePaymentLinkResult = {
  url: string;
  token: string;
  expiresAt: string;
  reused: boolean;
};

export type UpgradePaymentLinkPreview =
  | {
      ok: true;
      token: string;
      customerName: string | null;
      currentPlanName: string;
      targetPlanName: string;
      amountCents: number;
      promoSummary: string | null;
      nextBillingDate: string | null;
    }
  | {
      ok: false;
      reason: 'missing' | 'expired' | 'used' | 'unavailable';
      message: string;
    };

function buildUpgradePaymentUrl(token: string): string {
  return `${getSiteUrl()}/ativar-upgrade?token=${token}`;
}

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function createOrReuseUpgradePaymentLink(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<UpgradePaymentLinkResult | { error: string }> {
  const quote = await quotePlanUpgradeActivation(admin, subscriptionId);
  if (!quote) {
    return {
      error: 'Só é possível gerar o link com a assinatura em atraso e um upgrade pendente.',
    };
  }

  const { data: subscription } = await admin
    .from('subscriptions')
    .select('id, user_id')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription) return { error: 'Assinatura não encontrada.' };

  const now = new Date();
  const { data: existing } = await admin
    .from('plan_upgrade_payment_links')
    .select('token, expires_at')
    .eq('subscription_id', subscriptionId)
    .is('used_at', null)
    .gt('expires_at', now.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.token) {
    return {
      url: buildUpgradePaymentUrl(existing.token as string),
      token: existing.token as string,
      expiresAt: existing.expires_at as string,
      reused: true,
    };
  }

  const token = randomUUID();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + LINK_DAYS);

  const { error } = await admin.from('plan_upgrade_payment_links').insert({
    subscription_id: subscription.id,
    user_id: subscription.user_id,
    token,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error('[upgrade-payment-link] create:', error.message);
    return { error: 'Não foi possível gerar o link de pagamento.' };
  }

  return {
    url: buildUpgradePaymentUrl(token),
    token,
    expiresAt: expiresAt.toISOString(),
    reused: false,
  };
}

export async function loadUpgradePaymentLinkPreview(
  admin: SupabaseClient,
  token: string | null | undefined
): Promise<UpgradePaymentLinkPreview> {
  const value = token?.trim() ?? '';
  if (!value) {
    return {
      ok: false,
      reason: 'missing',
      message: 'Este link de pagamento está incompleto.',
    };
  }

  const { data: link } = await admin
    .from('plan_upgrade_payment_links')
    .select('token, expires_at, used_at, subscription_id, user_id')
    .eq('token', value)
    .maybeSingle();

  if (!link) {
    return {
      ok: false,
      reason: 'missing',
      message: 'Não encontramos este link de pagamento.',
    };
  }

  if (link.used_at) {
    return {
      ok: false,
      reason: 'used',
      message: 'Este pagamento já foi concluído. O plano novo já está ativo.',
    };
  }

  if (new Date(link.expires_at as string).getTime() <= Date.now()) {
    return {
      ok: false,
      reason: 'expired',
      message: 'Este link expirou. Peça um novo link para a DungeonBox.',
    };
  }

  const quote = await quotePlanUpgradeActivation(admin, link.subscription_id as string);
  if (!quote) {
    return {
      ok: false,
      reason: 'unavailable',
      message: 'Este upgrade não está mais aguardando pagamento.',
    };
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', link.user_id)
    .maybeSingle();

  const { data: subscription } = await admin
    .from('subscriptions')
    .select('next_billing_date')
    .eq('id', link.subscription_id)
    .maybeSingle();

  return {
    ok: true,
    token: link.token as string,
    customerName: (profile?.full_name as string | null) ?? null,
    currentPlanName: quote.currentPlanName,
    targetPlanName: quote.targetPlanName,
    amountCents: quote.amountCents,
    promoSummary: quote.promoSummary,
    nextBillingDate: (subscription?.next_billing_date as string | null) ?? null,
  };
}

async function resolvePagarmeCustomerId(
  admin: SupabaseClient,
  subscription: {
    user_id: string;
    pagarme_customer_id: string | null;
    pagarme_subscription_id: string | null;
  }
): Promise<string | null> {
  const local = subscription.pagarme_customer_id?.trim() || null;
  if (local) return local;

  const { data: profile } = await admin
    .from('profiles')
    .select('pagarme_customer_id')
    .eq('id', subscription.user_id)
    .maybeSingle();
  const fromProfile = (profile?.pagarme_customer_id as string | null)?.trim() || null;
  if (fromProfile) return fromProfile;

  const remoteId = subscription.pagarme_subscription_id?.trim();
  if (!remoteId) return null;

  const remote = await pagarmeRequest<{ customer?: { id?: string | null } | null }>(
    `/subscriptions/${encodeURIComponent(remoteId)}`
  );
  return remote.customer?.id?.trim() || null;
}

export async function payPlanUpgradeWithCardToken(input: {
  admin: SupabaseClient;
  token: string;
  cardToken: string;
  cardLast4: string;
  cardBrand: string;
}): Promise<{ success: true; targetPlanName: string } | { error: string }> {
  const preview = await loadUpgradePaymentLinkPreview(input.admin, input.token);
  if (!preview.ok) return { error: preview.message };

  const { data: link } = await input.admin
    .from('plan_upgrade_payment_links')
    .select('id, subscription_id, user_id')
    .eq('token', input.token)
    .is('used_at', null)
    .maybeSingle();

  if (!link) return { error: 'Este link de pagamento não está mais disponível.' };

  const subscriptionId = link.subscription_id as string;
  const userId = link.user_id as string;
  const quote = await quotePlanUpgradeActivation(input.admin, subscriptionId);
  if (!quote) return { error: 'Este upgrade não está mais aguardando pagamento.' };

  const { data: subscription } = await input.admin
    .from('subscriptions')
    .select(
      'id, user_id, address_id, pagarme_customer_id, pagarme_subscription_id, plans!plan_id(name), pending_plan:plans!pending_plan_id(name)'
    )
    .eq('id', subscriptionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!subscription?.address_id) {
    return { error: 'Assinatura sem endereço para cobrar o cartão.' };
  }

  const { data: address } = await input.admin
    .from('addresses')
    .select('recipient, zip_code, street, number, complement, neighborhood, city, state')
    .eq('id', subscription.address_id)
    .maybeSingle();

  if (
    !address?.zip_code ||
    !address.street ||
    !address.number ||
    !address.neighborhood ||
    !address.city ||
    !address.state
  ) {
    return { error: 'Endereço incompleto para cobrar o cartão.' };
  }

  let customerId: string | null;
  try {
    customerId = await resolvePagarmeCustomerId(input.admin, {
      user_id: userId,
      pagarme_customer_id: subscription.pagarme_customer_id as string | null,
      pagarme_subscription_id: subscription.pagarme_subscription_id as string | null,
    });
  } catch (error) {
    return { error: userFacingPagarmeError(error) };
  }

  if (!customerId) {
    return { error: 'Não foi possível localizar o cadastro de pagamento desta assinatura.' };
  }

  const { data: recentPayments } = await input.admin
    .from('payments')
    .select('id, amount_cents, paid_at, status_detail')
    .eq('subscription_id', subscriptionId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(5);

  const existingUpgrade = (recentPayments ?? []).find((row) => {
    const detail = row.status_detail as string | null;
    return typeof detail === 'string' && detail.includes('plan_upgrade_activation');
  });

  if (existingUpgrade) {
    await finalizePlanUpgradeActivation(input.admin, subscriptionId, {
      id: existingUpgrade.id as string,
      amount_cents: existingUpgrade.amount_cents as number,
      paid_at: (existingUpgrade.paid_at as string | null) ?? new Date().toISOString(),
    });
    await input.admin
      .from('plan_upgrade_payment_links')
      .update({ used_at: new Date().toISOString() })
      .eq('id', link.id)
      .is('used_at', null);
    return { success: true, targetPlanName: quote.targetPlanName };
  }

  let order;
  try {
    order = await chargePagarmeOneTimeOrder({
      customerId,
      valueCents: quote.amountCents,
      description: `DungeonBox — ativar upgrade ${quote.targetPlanName}`,
      billingAddress: buildBillingAddress({
        recipient: address.recipient ?? '',
        zip_code: address.zip_code,
        street: address.street,
        number: address.number,
        complement: address.complement,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
      }),
      orderCode: buildPagarmeSubscriptionPlanUpgradeCode(subscriptionId),
      cardToken: input.cardToken,
      metadata: {
        subscription_id: subscriptionId,
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
  const currentPlan = relOne(subscription.plans as { name: string } | { name: string }[] | null);
  const pendingPlan = relOne(
    subscription.pending_plan as { name: string } | { name: string }[] | null
  );

  const { data: paymentRow, error: paymentError } = await input.admin
    .from('payments')
    .upsert(
      {
        user_id: userId,
        subscription_id: subscriptionId,
        pagarme_order_id: ids.orderId,
        pagarme_charge_id: ids.chargeId,
        amount_cents: quote.amountCents,
        currency: 'BRL',
        status: 'approved',
        paid_at: now,
        payment_method: 'credit_card',
        card_brand: input.cardBrand,
        card_last4: input.cardLast4,
        installments: 1,
        status_detail: JSON.stringify({
          type: 'plan_upgrade_activation',
          from_plan: currentPlan?.name ?? quote.currentPlanName,
          to_plan: pendingPlan?.name ?? quote.targetPlanName,
          card_source: 'upgrade_payment_link',
        }),
      },
      { onConflict: 'pagarme_charge_id' }
    )
    .select('id, amount_cents, paid_at')
    .single();

  if (paymentError || !paymentRow) {
    return { error: 'Pagamento aprovado, mas não foi possível registrar a ativação.' };
  }

  const pagarmeSubscriptionId = (subscription.pagarme_subscription_id as string | null)?.trim();
  if (pagarmeSubscriptionId) {
    try {
      const cardId = await resolvePagarmeOrderCardId(order);
      if (cardId) {
        await updatePagarmeSubscriptionCard(pagarmeSubscriptionId, { cardId });
      }
    } catch (error) {
      console.error('[upgrade-payment-link] attach card after payment:', error);
    }
  }

  await input.admin
    .from('subscriptions')
    .update({
      pagarme_customer_id: customerId,
      card_last4: input.cardLast4,
      card_brand: input.cardBrand,
      updated_at: now,
    })
    .eq('id', subscriptionId);

  await finalizePlanUpgradeActivation(input.admin, subscriptionId, {
    id: paymentRow.id as string,
    amount_cents: paymentRow.amount_cents as number,
    paid_at: (paymentRow.paid_at as string | null) ?? now,
  });

  await input.admin
    .from('plan_upgrade_payment_links')
    .update({ used_at: now })
    .eq('id', link.id)
    .is('used_at', null);

  return { success: true, targetPlanName: quote.targetPlanName };
}
