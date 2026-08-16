import type { SupabaseClient } from '@supabase/supabase-js';
import type { BillingTerm } from '@/lib/checkout/combo-billing';
import { isComboTerm } from '@/lib/checkout/combo-billing';
import {
  extractPagarmeOrderCardId,
  fetchPagarmeOrder,
  isPagarmeChargePaid,
  resolvePagarmeOrderChargeIds,
  type PagarmeOrderResponse,
} from '@/lib/pagarme/one-time-order';
import { parsePagarmeSubscriptionComboCode, parsePagarmeSubscriptionComboTierCode } from '@/lib/pagarme/store-order-code';
import { notifyPurchaseCompleted } from '@/lib/email/subscription-notify';
import { notifyReferrerOnReferralConverted } from '@/lib/referral/referrer-notify';
import { seedPrepaidComboProductionSchedule } from '@/lib/subscriptions/combo-production-schedule';
import { activateSubscriptionFromPagarme } from '@/lib/subscriptions/activate-pagarme';
import { notifyAdminSubscriptionEvent } from '@/lib/admin/subscription-payment-notifications';
import { handlePagarmeComboUpgradePaymentConfirmed } from '@/lib/subscriptions/combo-upgrade';
import {
  handlePagarmeComboTierUpgradePaymentConfirmed,
} from '@/lib/subscriptions/combo-tier-upgrade';
import type { PagarmeBillingAddressInput } from '@/lib/pagarme/subscription-checkout';

function resolveSubscriptionIdFromComboOrder(input: {
  code?: string | null;
  metadata?: Record<string, string> | null;
}): string | null {
  if (
    (input.metadata?.charge_kind === 'combo' ||
      input.metadata?.charge_kind === 'combo_upgrade' ||
      input.metadata?.charge_kind === 'combo_tier_upgrade') &&
    input.metadata.subscription_id
  ) {
    return input.metadata.subscription_id;
  }
  return (
    parsePagarmeSubscriptionComboTierCode(input.code) ??
    parsePagarmeSubscriptionComboCode(input.code)
  );
}

function buildBillingAddressFromProfileAddress(address: {
  number: string;
  street: string;
  neighborhood: string;
  complement: string | null;
  zip_code: string;
  city: string;
  state: string;
}): PagarmeBillingAddressInput {
  return {
    line_1: `${address.number}, ${address.street}, ${address.neighborhood}`,
    line_2: address.complement ?? undefined,
    zip_code: address.zip_code.replace(/\D/g, ''),
    city: address.city,
    state: address.state,
    country: 'BR',
  };
}

export async function handlePagarmeComboPaymentConfirmed(
  supabase: SupabaseClient,
  input: {
    chargeId?: string | null;
    orderId?: string | null;
    code?: string | null;
    amountCents?: number | null;
    metadata?: Record<string, string> | null;
    paymentMethod?: 'pix' | 'credit_card' | null;
  }
): Promise<'processed' | 'skipped'> {
  const subscriptionId = resolveSubscriptionIdFromComboOrder({
    code: input.code,
    metadata: input.metadata,
  });
  if (!subscriptionId) return 'skipped';

  const { data: local } = await supabase
    .from('subscriptions')
    .select(
      'id, status, user_id, prepaid_until, billing_term, pending_billing_term, pending_plan_id, combo_total_cents, combo_installments, pagarme_customer_id, address_id'
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!local) return 'skipped';

  const isTierUpgrade =
    input.metadata?.charge_kind === 'combo_tier_upgrade' ||
    Boolean(parsePagarmeSubscriptionComboTierCode(input.code));

  if (
    isTierUpgrade &&
    local.status === 'active' &&
    local.pending_plan_id
  ) {
    return handlePagarmeComboTierUpgradePaymentConfirmed(
      supabase,
      {
        chargeId: input.chargeId,
        orderId: input.orderId,
        amountCents: input.amountCents,
      },
      subscriptionId
    );
  }

  const pendingUpgradeTerm = local.pending_billing_term as BillingTerm | null;
  if (
    local.status === 'active' &&
    pendingUpgradeTerm &&
    isComboTerm(pendingUpgradeTerm)
  ) {
    let cardId: string | null = null;
    let customerId = (local.pagarme_customer_id as string | null) ?? null;
    let billingAddress: PagarmeBillingAddressInput | null = null;

    if (input.orderId) {
      try {
        const order = await fetchPagarmeOrder(input.orderId);
        cardId = extractPagarmeOrderCardId(order);
        customerId =
          (order as { customer?: { id?: string } }).customer?.id ?? customerId;
      } catch (error) {
        console.error('[pagarme] combo upgrade fetch order:', error);
      }
    }

    if (local.address_id) {
      const { data: address } = await supabase
        .from('addresses')
        .select(
          'number, street, neighborhood, complement, zip_code, city, state'
        )
        .eq('id', local.address_id)
        .maybeSingle();
      if (address) {
        billingAddress = buildBillingAddressFromProfileAddress(address);
      }
    }

    return handlePagarmeComboUpgradePaymentConfirmed(
      supabase,
      {
        chargeId: input.chargeId,
        orderId: input.orderId,
        amountCents: input.amountCents,
        cardId,
        customerId,
        billingAddress,
      },
      subscriptionId
    );
  }

  if (local.status !== 'pending' && local.status !== 'active' && local.status !== 'past_due') {
    return 'skipped';
  }

  if (!isComboTerm((local.billing_term as BillingTerm | null) ?? 'monthly')) {
    return 'skipped';
  }

  const amountCents =
    local.combo_total_cents != null && local.combo_total_cents > 0
      ? local.combo_total_cents
      : Math.max(0, input.amountCents ?? 0);
  const installments = local.combo_installments ?? 1;
  const now = new Date().toISOString();
  const wasPending = local.status === 'pending';

  let paymentMethod: 'pix' | 'credit_card' =
    input.paymentMethod === 'pix' ? 'pix' : 'credit_card';
  if (input.chargeId) {
    const { data: existing } = await supabase
      .from('payments')
      .select('payment_method')
      .eq('pagarme_charge_id', input.chargeId)
      .maybeSingle();
    if (existing?.payment_method === 'pix') {
      paymentMethod = 'pix';
    }
  }

  const paymentPayload = {
    user_id: local.user_id,
    subscription_id: local.id,
    amount_cents: amountCents,
    currency: 'BRL',
    status: 'approved' as const,
    paid_at: now,
    installments,
    payment_method: paymentMethod,
    status_detail: JSON.stringify({
      type: 'combo_prepaid',
      billing_term: local.billing_term,
      combo_total_cents: amountCents,
      combo_installments: installments > 1 ? installments : undefined,
      gateway: 'pagarme',
    }),
    ...(input.chargeId ? { pagarme_charge_id: input.chargeId } : {}),
    ...(input.orderId ? { pagarme_order_id: input.orderId } : {}),
  };

  let paymentRow: { id: string; amount_cents: number } | null = null;

  if (input.chargeId) {
    const { data } = await supabase
      .from('payments')
      .upsert(paymentPayload, { onConflict: 'pagarme_charge_id' })
      .select('id, amount_cents')
      .single();
    paymentRow = data;
  } else {
    const { data } = await supabase
      .from('payments')
      .insert(paymentPayload)
      .select('id, amount_cents')
      .single();
    paymentRow = data;
  }

  if (wasPending) {
    const activated = await activateSubscriptionFromPagarme(supabase, local.id);
    if (!activated) {
      console.error(
        '[pagarme] combo payment confirmed but activation failed:',
        local.id
      );
      return 'skipped';
    }
  }

  if (paymentRow) {
    const { count: existingCycles } = await supabase
      .from('subscription_cycles')
      .select('id', { count: 'exact', head: true })
      .eq('subscription_id', local.id);

    await seedPrepaidComboProductionSchedule(supabase, {
      subscriptionId: local.id,
      billingTerm: (local.billing_term as BillingTerm) ?? 'combo_3',
      paymentLink: {
        id: paymentRow.id,
        amount_cents: paymentRow.amount_cents,
        paid_at: now,
      },
      anchorDate: new Date(now),
      resyncOnly: (existingCycles ?? 0) > 0,
    });
  }

  if (wasPending) {
    void notifyPurchaseCompleted(
      supabase,
      local.id,
      paymentRow?.amount_cents ?? amountCents,
      1
    ).catch((err) => {
      console.error('[email] pagarme combo purchase notify failed:', err);
    });

    void notifyReferrerOnReferralConverted(supabase, local.id).catch((err) => {
      console.error('[email] referral converted notify failed:', err);
    });

    void notifyAdminSubscriptionEvent(supabase, {
      type: 'subscription_activated',
      subscriptionId: local.id,
      userId: local.user_id,
      paymentId: paymentRow?.id ?? null,
      amountCents,
      paymentMethod,
      gateway: 'pagarme',
      cycleNumber: 1,
    }).catch((err) => {
      console.error('[admin] pagarme combo activated notify failed:', err);
    });
  }

  return 'processed';
}

export async function syncPagarmeComboOrderPayment(
  supabase: SupabaseClient,
  order: PagarmeOrderResponse,
  subscriptionId: string
): Promise<{ activated: boolean }> {
  const ids = resolvePagarmeOrderChargeIds(order);
  const chargeStatus = ids.chargeStatus;
  if (!ids.chargeId || !isPagarmeChargePaid(chargeStatus)) {
    return { activated: false };
  }

  const result = await handlePagarmeComboPaymentConfirmed(supabase, {
    chargeId: ids.chargeId,
    orderId: ids.orderId,
    code: order.code,
    amountCents: Math.round(order.charges?.[0]?.amount ?? 0),
    metadata: order.metadata ?? null,
  });

  if (result === 'processed') {
    return { activated: true };
  }

  const { data: local } = await supabase
    .from('subscriptions')
    .select('status, billing_term')
    .eq('id', subscriptionId)
    .maybeSingle();

  const billingTerm = (local?.billing_term as BillingTerm | null) ?? 'monthly';

  return {
    activated: local?.status === 'active' && isComboTerm(billingTerm),
  };
}

export async function syncPagarmeComboOrderById(
  supabase: SupabaseClient,
  orderId: string,
  subscriptionId: string
): Promise<{ activated: boolean }> {
  try {
    const order = await fetchPagarmeOrder(orderId);
    return syncPagarmeComboOrderPayment(supabase, order, subscriptionId);
  } catch (error) {
    console.error('[pagarme] sync combo order failed:', orderId, error);
    return { activated: false };
  }
}
