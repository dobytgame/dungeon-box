import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchPagarmeOrder,
  isPagarmeChargePaid,
} from '@/lib/pagarme/one-time-order';
import { findLocalSubscriptionByPagarmeId } from '@/lib/pagarme/resolve-local-subscription';
import {
  handleStoreOrderPagarmeChargePaid,
  handleStoreOrderPagarmePaymentFailed,
} from '@/lib/asaas/store-order-payment';
import { activateSubscriptionFromPagarme } from '@/lib/subscriptions/activate-pagarme';
import { markCyclePreparing, processActiveSubscriptionPayment } from '@/lib/subscriptions/cycles';
import { notifyPurchaseCompleted } from '@/lib/email/subscription-notify';
import { applySubscriptionStatusChange } from '@/lib/subscriptions/apply-status-change';
import { cleanupSubscriptionCyclesOnCancel } from '@/lib/subscriptions/cycles';
import { cancelReferralForSubscription } from '@/lib/referral/referrals';

export type PagarmeWebhookCharge = {
  id?: string;
  status?: string;
  amount?: number;
  subscription_id?: string;
  customer_id?: string;
  code?: string | null;
  metadata?: Record<string, string>;
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

export async function handlePagarmeChargePaid(
  supabase: SupabaseClient,
  charge: PagarmeWebhookCharge
): Promise<'processed' | 'skipped'> {
  if (!charge.id) return 'skipped';

  if (!charge.subscription_id) {
    const storeResult = await handleStoreOrderPagarmeChargePaid(supabase, charge);
    if (storeResult === 'processed') return 'processed';
  }

  const pagarmeSubscriptionId = charge.subscription_id;
  if (!pagarmeSubscriptionId) return 'skipped';

  const local = await findLocalSubscriptionByPagarmeId(
    supabase,
    pagarmeSubscriptionId
  );
  if (!local) return 'skipped';

  const amountCents = chargeAmountCents(charge);
  const now = new Date().toISOString();

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
        paid_at: now,
        payment_method: 'credit_card',
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
        paid_at: now,
      });
    }
    void notifyPurchaseCompleted(supabase, local.id, amountCents, 1).catch(
      (err) => {
        console.error('[email] pagarme purchase completed notify failed:', err);
      }
    );
    return 'processed';
  }

  if (local.status === 'active') {
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
          paid_at: now,
        },
        periodEnd.toISOString()
      );
    }
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
  return 'processed';
}

export async function handlePagarmeChargeFailed(
  supabase: SupabaseClient,
  charge: PagarmeWebhookCharge
): Promise<'processed' | 'skipped'> {
  if (!charge.subscription_id) {
    const storeFailed = await handleStoreOrderPagarmePaymentFailed(supabase, {
      code: charge.code,
      id: charge.id,
      metadata: charge.metadata,
    });
    if (storeFailed === 'processed') return 'processed';
    return 'skipped';
  }

  const pagarmeSubscriptionId = charge.subscription_id;

  const local = await findLocalSubscriptionByPagarmeId(
    supabase,
    pagarmeSubscriptionId
  );
  if (!local || local.status !== 'active') return 'skipped';

  await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('id', local.id);
  return 'processed';
}

export async function handlePagarmeOrderPaid(
  supabase: SupabaseClient,
  order: PagarmeWebhookOrder
): Promise<'processed' | 'skipped'> {
  const charges = order.charges ?? [];

  for (const charge of charges) {
    const result = await handleStoreOrderPagarmeChargePaid(supabase, {
      ...charge,
      code: charge.code ?? order.code,
      metadata: charge.metadata ?? order.metadata,
    });
    if (result === 'processed') return 'processed';
  }

  if (order.id) {
    try {
      const remote = await fetchPagarmeOrder(order.id);
      const charge = remote.charges?.[0];
      const chargeStatus =
        charge?.status ?? charge?.last_transaction?.status ?? remote.status;

      if (charge?.id && isPagarmeChargePaid(chargeStatus)) {
        const result = await handleStoreOrderPagarmeChargePaid(supabase, {
          id: charge.id,
          amount: charge.amount,
          code: remote.code ?? order.code,
          metadata: remote.metadata ?? order.metadata,
        });
        if (result === 'processed') return 'processed';
      }
    } catch (error) {
      console.error('[pagarme] order.paid fetch order:', order.id, error);
    }
  }

  const fallback = await handleStoreOrderPagarmeChargePaid(supabase, {
    code: order.code,
    metadata: order.metadata,
  });
  return fallback;
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
    const activated = await activateSubscriptionFromPagarme(
      supabase,
      local.id,
      subscription.next_billing_at ?? null
    );
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

  return 'processed';
}
