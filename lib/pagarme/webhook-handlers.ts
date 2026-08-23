import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchPagarmeOrder,
  isPagarmeChargePaid,
} from '@/lib/pagarme/one-time-order';
import {
  findLocalSubscriptionByPagarmeId,
  resolveLocalSubscriptionFromPagarmeCharge,
} from '@/lib/pagarme/resolve-local-subscription';
import {
  handleStoreOrderPagarmeChargePaid,
  handleStoreOrderPagarmePaymentFailed,
  parseStoreOrderExternalReference,
} from '@/lib/asaas/store-order-payment';
import { handlePagarmeComboPaymentConfirmed } from '@/lib/pagarme/combo-payment';
import { notifyAdminSubscriptionEvent } from '@/lib/admin/subscription-payment-notifications';
import { activateSubscriptionFromPagarme } from '@/lib/subscriptions/activate-pagarme';
import { markCyclePreparing, processActiveSubscriptionPayment } from '@/lib/subscriptions/cycles';
import { notifyPurchaseCompleted } from '@/lib/email/subscription-notify';
import { applySubscriptionStatusChange } from '@/lib/subscriptions/apply-status-change';
import { cleanupSubscriptionCyclesOnCancel } from '@/lib/subscriptions/cycles';
import { cancelReferralForSubscription } from '@/lib/referral/referrals';
import { resolveGatewayPaidAt } from '@/lib/datetime/brazil';
import { isComboTerm, type BillingTerm } from '@/lib/checkout/combo-billing';

export type PagarmeWebhookCharge = {
  id?: string;
  status?: string;
  amount?: number;
  payment_method?: string;
  subscription_id?: string;
  customer_id?: string;
  code?: string | null;
  paid_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, string>;
  last_transaction?: {
    status?: string;
    updated_at?: string;
  };
};

export type PagarmeWebhookSubscription = {
  id?: string;
  status?: string;
  next_billing_at?: string;
  metadata?: Record<string, string>;
};

export type PagarmeWebhookOrder = {
  id?: string;
  code?: string | null;
  status?: string;
  metadata?: Record<string, string>;
  charges?: PagarmeWebhookCharge[];
};

function chargeAmountCents(charge: PagarmeWebhookCharge): number {
  return Math.round(charge.amount ?? 0);
}

function resolvePagarmeChargePaidAt(
  charge: PagarmeWebhookCharge,
  existingPaidAt?: string | null
): string {
  const gatewayPaidAt =
    charge.paid_at?.trim() ||
    charge.last_transaction?.updated_at?.trim() ||
    charge.updated_at?.trim() ||
    null;

  return resolveGatewayPaidAt(existingPaidAt, gatewayPaidAt);
}

function isComboChargeKind(kind?: string | null): boolean {
  return (
    kind === 'combo' ||
    kind === 'combo_upgrade' ||
    kind === 'combo_tier_upgrade'
  );
}

function resolvePagarmePaymentMethod(
  charge: PagarmeWebhookCharge,
  existing?: string | null
): 'pix' | 'credit_card' {
  if (existing === 'pix') return 'pix';
  const method = charge.payment_method?.trim().toLowerCase();
  if (method === 'pix') return 'pix';
  const kind = charge.metadata?.charge_kind;
  if (kind === 'admin_pix' || kind === 'pix_renewal') return 'pix';
  if (existing === 'credit_card') return 'credit_card';
  return 'credit_card';
}

function mergeChargeFromOrder(
  charge: PagarmeWebhookCharge,
  order: PagarmeWebhookOrder
): PagarmeWebhookCharge {
  return {
    ...charge,
    code: charge.code ?? order.code,
    metadata: {
      ...(order.metadata ?? {}),
      ...(charge.metadata ?? {}),
    },
  };
}

export async function handlePagarmeChargePaid(
  supabase: SupabaseClient,
  charge: PagarmeWebhookCharge
): Promise<'processed' | 'skipped'> {
  if (!charge.id) return 'skipped';

  if (isComboChargeKind(charge.metadata?.charge_kind)) {
    const comboResult = await handlePagarmeComboPaymentConfirmed(supabase, {
      chargeId: charge.id,
      code: charge.code,
      amountCents: chargeAmountCents(charge),
      metadata: charge.metadata ?? null,
      paymentMethod: resolvePagarmePaymentMethod(charge),
    });
    if (comboResult === 'processed') return 'processed';
  }

  const isStoreCharge =
    Boolean(charge.metadata?.store_order_id?.trim()) ||
    Boolean(parseStoreOrderExternalReference(charge.metadata?.external_reference));
  if (isStoreCharge) {
    return handleStoreOrderPagarmeChargePaid(supabase, charge);
  }

  const subscriptionFromCharge = await resolveLocalSubscriptionFromPagarmeCharge(
    supabase,
    charge
  );

  if (!subscriptionFromCharge) {
    const comboResult = await handlePagarmeComboPaymentConfirmed(supabase, {
      chargeId: charge.id,
      code: charge.code,
      amountCents: chargeAmountCents(charge),
      metadata: charge.metadata ?? null,
      paymentMethod: resolvePagarmePaymentMethod(charge),
    });
    if (comboResult === 'processed') return 'processed';

    const storeResult = await handleStoreOrderPagarmeChargePaid(supabase, charge);
    if (storeResult === 'processed') return 'processed';

    return 'skipped';
  }

  const local = subscriptionFromCharge;

  if (!charge.subscription_id) {
    const { data: extra } = await supabase
      .from('subscriptions')
      .select('billing_term, status')
      .eq('id', local.id)
      .maybeSingle();

    if (
      extra?.status === 'pending' &&
      isComboTerm((extra.billing_term as BillingTerm | null) ?? 'monthly')
    ) {
      return handlePagarmeComboPaymentConfirmed(supabase, {
        chargeId: charge.id,
        code: charge.code,
        amountCents: chargeAmountCents(charge),
        metadata: {
          ...(charge.metadata ?? {}),
          subscription_id: local.id,
          charge_kind: charge.metadata?.charge_kind ?? 'combo',
        },
        paymentMethod: resolvePagarmePaymentMethod(charge),
      });
    }
  }

  const amountCents = chargeAmountCents(charge);

  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id, paid_at, payment_method')
    .eq('pagarme_charge_id', charge.id)
    .maybeSingle();

  const paidAt = resolvePagarmeChargePaidAt(
    charge,
    existingPayment?.paid_at as string | null
  );
  const paymentMethod = resolvePagarmePaymentMethod(
    charge,
    existingPayment?.payment_method as string | null
  );

  const { data: paymentRow } = await supabase
    .from('payments')
    .upsert(
      {
        user_id: local.user_id,
        subscription_id: local.id,
        pagarme_charge_id: charge.id,
        amount_cents: amountCents,
        currency: 'BRL',
        status: 'approved',
        paid_at: paidAt,
        payment_method: paymentMethod,
      },
      { onConflict: 'pagarme_charge_id' }
    )
    .select('id, amount_cents')
    .single();

  if (local.status === 'pending') {
    const activated = await activateSubscriptionFromPagarme(
      supabase,
      local.id,
      null
    );
    if (!activated) {
      console.error('[pagarme] charge paid but activation failed:', local.id);
      return 'skipped';
    }
    if (paymentRow) {
      await markCyclePreparing(supabase, local.id, 1, {
        id: paymentRow.id,
        amount_cents: paymentRow.amount_cents,
        paid_at: paidAt,
      });
    }
    void notifyPurchaseCompleted(supabase, local.id, amountCents, 1).catch(
      (err) => {
        console.error('[email] pagarme purchase completed notify failed:', err);
      }
    );
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
      console.error('[admin] subscription activated notify failed:', err);
    });
    return 'processed';
  }

  if (local.status === 'active' || local.status === 'past_due') {
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    if (paymentRow) {
      await processActiveSubscriptionPayment(
        supabase,
        local.id,
        local.current_cycle,
        {
          id: paymentRow.id,
          amount_cents: paymentRow.amount_cents,
          paid_at: paidAt,
        },
        periodEnd.toISOString()
      );
    }
    void notifyAdminSubscriptionEvent(supabase, {
      type: 'subscription_renewal_paid',
      subscriptionId: local.id,
      userId: local.user_id,
      paymentId: paymentRow?.id ?? null,
      amountCents,
      paymentMethod,
      gateway: 'pagarme',
      cycleNumber: local.current_cycle,
    }).catch((err) => {
      console.error('[admin] subscription renewal notify failed:', err);
    });
    return 'processed';
  }

  return 'processed';
}

export async function handlePagarmeSubscriptionCanceled(
  supabase: SupabaseClient,
  subscription: PagarmeWebhookSubscription
): Promise<'processed' | 'skipped'> {
  if (!subscription.id) return 'skipped';

  const local = await findLocalSubscriptionByPagarmeId(supabase, subscription.id);
  if (!local) return 'skipped';

  if (local.status === 'cancelled') return 'processed';

  await applySubscriptionStatusChange(supabase, local.id, 'cancel', {});
  await cleanupSubscriptionCyclesOnCancel(supabase, local.id);
  await cancelReferralForSubscription(supabase, local.id);
  void notifyAdminSubscriptionEvent(supabase, {
    type: 'subscription_cancelled',
    subscriptionId: local.id,
    userId: local.user_id,
    gateway: 'pagarme',
  }).catch((err) => {
    console.error('[admin] subscription cancelled notify failed:', err);
  });
  return 'processed';
}

export async function handlePagarmeChargeFailed(
  supabase: SupabaseClient,
  charge: PagarmeWebhookCharge
): Promise<'processed' | 'skipped'> {
  const local = await resolveLocalSubscriptionFromPagarmeCharge(supabase, charge);
  if (!local) {
    const storeFailed = await handleStoreOrderPagarmePaymentFailed(supabase, {
      code: charge.code,
      id: charge.id,
      metadata: charge.metadata,
    });
    if (storeFailed === 'processed') return 'processed';
    return 'skipped';
  }

  if (local.status !== 'active') return 'skipped';

  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('id', local.id);
  void notifyAdminSubscriptionEvent(supabase, {
    type: 'subscription_payment_failed',
    subscriptionId: local.id,
    userId: local.user_id,
    gateway: 'pagarme',
    detail: 'Cobrança recusada pelo Pagar.me.',
  }).catch((err) => {
    console.error('[admin] subscription payment failed notify:', err);
  });
  return 'processed';
}

export async function handlePagarmeOrderPaid(
  supabase: SupabaseClient,
  order: PagarmeWebhookOrder
): Promise<'processed' | 'skipped'> {
  const charges = order.charges ?? [];

  for (const charge of charges) {
    const merged = mergeChargeFromOrder(charge, order);
    const comboResult = await handlePagarmeComboPaymentConfirmed(supabase, {
      chargeId: merged.id,
      orderId: order.id,
      code: merged.code,
      amountCents: chargeAmountCents(merged),
      metadata: merged.metadata ?? null,
      paymentMethod: resolvePagarmePaymentMethod(merged),
    });
    if (comboResult === 'processed') return 'processed';

    const result = await handleStoreOrderPagarmeChargePaid(supabase, merged);
    if (result === 'processed') return 'processed';

    const subscriptionResult = await handlePagarmeChargePaid(supabase, merged);
    if (subscriptionResult === 'processed') return 'processed';
  }

  if (order.id) {
    try {
      const remote = await fetchPagarmeOrder(order.id);
      const charge = remote.charges?.[0];
      const chargeStatus =
        charge?.status ?? charge?.last_transaction?.status ?? remote.status;

      if (charge?.id && isPagarmeChargePaid(chargeStatus)) {
        const merged: PagarmeWebhookCharge = {
          id: charge.id,
          status: charge.status,
          amount: charge.amount,
          code: remote.code ?? order.code,
          metadata: remote.metadata ?? order.metadata,
        };
        const comboResult = await handlePagarmeComboPaymentConfirmed(supabase, {
          chargeId: charge.id,
          orderId: remote.id ?? order.id,
          code: remote.code ?? order.code,
          amountCents: Math.round(charge.amount ?? 0),
          metadata: remote.metadata ?? order.metadata ?? null,
          paymentMethod: resolvePagarmePaymentMethod(merged),
        });
        if (comboResult === 'processed') return 'processed';

        const result = await handleStoreOrderPagarmeChargePaid(supabase, merged);
        if (result === 'processed') return 'processed';

        const subscriptionResult = await handlePagarmeChargePaid(
          supabase,
          merged
        );
        if (subscriptionResult === 'processed') return 'processed';
      }
    } catch (error) {
      console.error('[pagarme] order.paid fetch order:', order.id, error);
    }
  }

  const comboFallback = await handlePagarmeComboPaymentConfirmed(supabase, {
    orderId: order.id,
    code: order.code,
    metadata: order.metadata ?? null,
  });
  if (comboFallback === 'processed') return 'processed';

  const fallback = await handleStoreOrderPagarmeChargePaid(supabase, {
    code: order.code,
    metadata: order.metadata,
  });
  if (fallback === 'processed') return 'processed';

  return handlePagarmeChargePaid(supabase, {
    code: order.code,
    metadata: order.metadata,
  });
}

export async function handlePagarmeOrderPaymentFailed(
  supabase: SupabaseClient,
  order: PagarmeWebhookOrder
): Promise<'processed' | 'skipped'> {
  return handleStoreOrderPagarmePaymentFailed(supabase, order);
}

export async function handlePagarmeSubscriptionActive(
  supabase: SupabaseClient,
  subscription: PagarmeWebhookSubscription
): Promise<'processed' | 'skipped'> {
  if (!subscription.id) return 'skipped';
  if (subscription.status !== 'active') return 'skipped';

  const local = await findLocalSubscriptionByPagarmeId(supabase, subscription.id);
  if (!local) return 'skipped';

  if (local.status === 'pending') {
    const { data: detail } = await supabase
      .from('subscriptions')
      .select('billing_term')
      .eq('id', local.id)
      .maybeSingle();

    const billingTerm = (detail?.billing_term as string | null) ?? 'monthly';
    if (
      billingTerm === 'combo_3' ||
      billingTerm === 'combo_6' ||
      billingTerm === 'combo_12'
    ) {
      // Combos só ativam com pagamento do pedido pré-pago, não pela assinatura remota.
      return 'skipped';
    }

    const activated = await activateSubscriptionFromPagarme(
      supabase,
      local.id,
      subscription.next_billing_at ?? null
    );
    if (activated) {
      const { importPaidInvoicesForPagarmeSubscription } = await import(
        '@/lib/pagarme/import-charges'
      );
      await importPaidInvoicesForPagarmeSubscription(supabase, subscription.id);
    }
    return activated ? 'processed' : 'skipped';
  }

  if (subscription.next_billing_at) {
    await supabase
      .from('subscriptions')
      .update({
        next_billing_date: subscription.next_billing_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', local.id);
  }

  const { importPaidInvoicesForPagarmeSubscription } = await import(
    '@/lib/pagarme/import-charges'
  );
  await importPaidInvoicesForPagarmeSubscription(supabase, subscription.id);

  return 'processed';
}
