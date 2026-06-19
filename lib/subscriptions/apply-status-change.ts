import type { SupabaseClient } from '@supabase/supabase-js';
import {
  cancelAsaasSubscriptionBestEffort,
  pauseAsaasSubscription,
  resumeAsaasSubscription,
} from '@/lib/asaas/subscription-api';
import { getStripe, STRIPE_CONFIGURED } from '@/lib/stripe/server';
import {
  MP_CONFIGURED,
  updateMpPreapprovalStatus,
  type MpPreapprovalStatus,
} from '@/lib/mercadopago';
import { ASAAS_CONFIGURED } from '@/lib/asaas/client';

export type SubscriptionStatusAction = 'pause' | 'cancel' | 'resume';

type SubscriptionRow = {
  id: string;
  user_id: string;
  mp_subscription_id: string | null;
  stripe_subscription_id: string | null;
  asaas_subscription_id: string | null;
  status: string;
  next_billing_date: string | null;
};

export async function applySubscriptionStatusChange(
  supabase: SupabaseClient,
  subscriptionId: string,
  action: SubscriptionStatusAction,
  options: {
    reason?: string | null;
    userId?: string;
  } = {}
): Promise<{ error?: string }> {
  let query = supabase
    .from('subscriptions')
    .select(
      'id, user_id, mp_subscription_id, stripe_subscription_id, asaas_subscription_id, status, next_billing_date'
    )
    .eq('id', subscriptionId);

  if (options.userId) {
    query = query.eq('user_id', options.userId);
  }

  const { data: subscription } = await query.maybeSingle();

  if (!subscription) {
    return { error: 'Assinatura não encontrada' };
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  let mpStatus: MpPreapprovalStatus | null = null;

  if (action === 'pause') {
    updates.status = 'paused';
    mpStatus = 'paused';
  } else if (action === 'resume') {
    updates.status = 'active';
    updates.cancelled_at = null;
    updates.cancel_reason = null;
    mpStatus = 'authorized';
  } else if (action === 'cancel') {
    updates.status = 'cancelled';
    updates.cancelled_at = new Date().toISOString();
    updates.cancel_reason =
      options.reason?.trim() ||
      (subscription.status === 'pending'
        ? 'Tentativa de checkout abandonada'
        : null);
    mpStatus = 'cancelled';
  }

  const row = subscription as SubscriptionRow;

  if (row.asaas_subscription_id && ASAAS_CONFIGURED) {
    try {
      if (action === 'cancel') {
        await cancelAsaasSubscriptionBestEffort(row.asaas_subscription_id);
      } else if (action === 'pause') {
        await pauseAsaasSubscription(row.asaas_subscription_id);
      } else if (action === 'resume') {
        const nextDue = row.next_billing_date
          ? new Date(row.next_billing_date)
          : (() => {
              const fallback = new Date();
              fallback.setMonth(fallback.getMonth() + 1);
              return fallback;
            })();
        await resumeAsaasSubscription(row.asaas_subscription_id, nextDue);
      }
    } catch (error) {
      console.error('Asaas subscription update:', error);
      return {
        error:
          'Não foi possível atualizar a assinatura no Asaas. Tente novamente.',
      };
    }
  } else if (
    row.stripe_subscription_id &&
    STRIPE_CONFIGURED &&
    (action === 'pause' || action === 'resume' || action === 'cancel')
  ) {
    try {
      const stripe = getStripe();
      if (action === 'cancel') {
        await stripe.subscriptions.cancel(row.stripe_subscription_id);
      } else if (action === 'pause') {
        await stripe.subscriptions.update(row.stripe_subscription_id, {
          pause_collection: { behavior: 'void' },
        });
      } else {
        await stripe.subscriptions.update(row.stripe_subscription_id, {
          pause_collection: null,
        });
      }
    } catch (error) {
      console.error('Stripe subscription update:', error);
      return {
        error:
          'Não foi possível atualizar a assinatura no Stripe. Tente novamente.',
      };
    }
  } else if (mpStatus && row.mp_subscription_id && MP_CONFIGURED) {
    try {
      await updateMpPreapprovalStatus(row.mp_subscription_id, mpStatus);
    } catch (error) {
      console.error('MP preapproval update:', error);
      return {
        error:
          'Não foi possível atualizar a assinatura no Mercado Pago. Tente novamente.',
      };
    }
  }

  let updateQuery = supabase.from('subscriptions').update(updates).eq('id', subscriptionId);

  if (options.userId) {
    updateQuery = updateQuery.eq('user_id', options.userId);
  }

  const { error } = await updateQuery;

  if (error) {
    return { error: error.message };
  }

  return {};
}
