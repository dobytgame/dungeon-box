import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchPagarmeSubscription } from '@/lib/pagarme/subscription-api';
import { findLocalSubscriptionByPagarmeId } from '@/lib/pagarme/resolve-local-subscription';
import { activateSubscriptionFromPagarme } from '@/lib/subscriptions/activate-pagarme';
import { notifyPurchaseCompleted } from '@/lib/email/subscription-notify';
import { syncPagarmeComboOrderById } from '@/lib/pagarme/combo-payment';
import { isComboTerm, type BillingTerm } from '@/lib/checkout/combo-billing';

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
  if (
    subscription.status !== 'pending' ||
    !subscription.pagarme_subscription_id
  ) {
    return false;
  }

  const result = await syncPagarmeSubscriptionPayments(
    supabase,
    subscription.pagarme_subscription_id
  );
  return result.activated;
}
