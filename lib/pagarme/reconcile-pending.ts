import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchPagarmeSubscription } from '@/lib/pagarme/subscription-api';
import { findLocalSubscriptionByPagarmeId } from '@/lib/pagarme/resolve-local-subscription';
import { activateSubscriptionFromPagarme } from '@/lib/subscriptions/activate-pagarme';
import { notifyPurchaseCompleted } from '@/lib/email/subscription-notify';
import {
  syncPagarmeComboOrderById,
  syncPagarmeComboOrderPayment,
} from '@/lib/pagarme/combo-payment';
import { isComboTerm, type BillingTerm } from '@/lib/checkout/combo-billing';
import {
  fetchPagarmeOrder,
  isPagarmeChargePaid,
  resolvePagarmeOrderChargeIds,
} from '@/lib/pagarme/one-time-order';

export async function reconcilePendingPagarmePixOrder(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<boolean> {
  const { data: payment } = await supabase
    .from('payments')
    .select('pagarme_order_id, payment_method')
    .eq('subscription_id', subscriptionId)
    .eq('status', 'pending')
    .not('pagarme_order_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!payment?.pagarme_order_id) return false;

  const { data: local } = await supabase
    .from('subscriptions')
    .select('billing_term, status')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (local?.status !== 'pending') return false;

  try {
    const order = await fetchPagarmeOrder(payment.pagarme_order_id as string);
    const ids = resolvePagarmeOrderChargeIds(order);
    if (!ids.chargeId || !isPagarmeChargePaid(ids.chargeStatus)) {
      return false;
    }

    const billingTerm = (local.billing_term as BillingTerm | null) ?? 'monthly';
    if (isComboTerm(billingTerm)) {
      const result = await syncPagarmeComboOrderPayment(
        supabase,
        order,
        subscriptionId
      );
      return result.activated;
    }

    const { handlePagarmeChargePaid } = await import(
      '@/lib/pagarme/webhook-handlers'
    );
    const result = await handlePagarmeChargePaid(supabase, {
      id: ids.chargeId,
      amount: order.charges?.[0]?.amount,
      payment_method:
        (payment.payment_method as string | null) === 'pix' ? 'pix' : undefined,
      code: order.code,
      metadata: order.metadata,
    });
    return result === 'processed';
  } catch (error) {
    console.error(
      '[pagarme] reconcile pending pix order:',
      subscriptionId,
      error
    );
    return false;
  }
}

export async function syncPagarmeSubscriptionPayments(
  supabase: SupabaseClient,
  pagarmeSubscriptionId: string
): Promise<{ activated: boolean }> {
  const local = await findLocalSubscriptionByPagarmeId(
    supabase,
    pagarmeSubscriptionId
  );
  if (!local) return { activated: false };

  const { data: detail } = await supabase
    .from('subscriptions')
    .select('billing_term')
    .eq('id', local.id)
    .maybeSingle();

  const billingTerm = (detail?.billing_term as BillingTerm | null) ?? 'monthly';
  if (isComboTerm(billingTerm)) {
    const { data: comboPayment } = await supabase
      .from('payments')
      .select('pagarme_order_id')
      .eq('subscription_id', local.id)
      .not('pagarme_order_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (comboPayment?.pagarme_order_id) {
      return syncPagarmeComboOrderById(
        supabase,
        comboPayment.pagarme_order_id as string,
        local.id
      );
    }

    return { activated: false };
  }

  const remote = await fetchPagarmeSubscription(pagarmeSubscriptionId);
  if (remote.status !== 'active') return { activated: false };

  if (local.status !== 'pending') return { activated: false };

  const activated = await activateSubscriptionFromPagarme(
    supabase,
    local.id,
    null
  );

  if (activated) {
    void notifyPurchaseCompleted(supabase, local.id, 0, 1).catch((err) => {
      console.error('[pagarme] sync notify failed:', err);
    });
  }

  return { activated };
}

export async function reconcilePendingPagarmeSubscription(
  supabase: SupabaseClient,
  subscription: {
    id: string;
    status: string;
    pagarme_subscription_id?: string | null;
  }
): Promise<boolean> {
  if (subscription.status !== 'pending') {
    return false;
  }

  if (await reconcilePendingPagarmePixOrder(supabase, subscription.id)) {
    return true;
  }

  if (!subscription.pagarme_subscription_id) {
    return false;
  }

  const result = await syncPagarmeSubscriptionPayments(
    supabase,
    subscription.pagarme_subscription_id
  );
  return result.activated;
}
