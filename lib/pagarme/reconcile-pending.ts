import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchPagarmeSubscription } from '@/lib/pagarme/subscription-api';
import { findLocalSubscriptionByPagarmeId } from '@/lib/pagarme/resolve-local-subscription';
import { activateSubscriptionFromPagarme } from '@/lib/subscriptions/activate-pagarme';
import { notifyPurchaseCompleted } from '@/lib/email/subscription-notify';

export async function syncPagarmeSubscriptionPayments(
  supabase: SupabaseClient,
  pagarmeSubscriptionId: string
): Promise<{ activated: boolean }> {
  const local = await findLocalSubscriptionByPagarmeId(
    supabase,
    pagarmeSubscriptionId
  );
  if (!local) return { activated: false };

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
