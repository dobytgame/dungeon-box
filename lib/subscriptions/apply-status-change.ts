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
import {
  cancelPagarmeSubscriptionBestEffort,
  pausePagarmeSubscriptionBilling,
  resumePagarmeSubscriptionBilling,
} from '@/lib/pagarme/subscription-api';
import { PAGARME_CONFIGURED } from '@/lib/pagarme/client';
import { ASAAS_CONFIGURED } from '@/lib/asaas/client';
import { cancelReferralForSubscription } from '@/lib/referral/referrals';
import { cancelPendingRedemptionsForUser } from '@/lib/referral/redemptions';
import { cleanupSubscriptionCyclesOnCancel } from '@/lib/subscriptions/cycles';

export type SubscriptionStatusAction = 'pause' | 'cancel' | 'resume';

/** Próxima cobrança na retomada: a data salva, se ainda for futura; senão, daqui a um mês. */
export function resolveResumeBillingDate(
  nextBillingDate: string | null,
  now = new Date()
): Date {
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );

  if (nextBillingDate) {
    const parsed = new Date(
      nextBillingDate.includes('T') || nextBillingDate.includes(' ')
        ? nextBillingDate
        : `${nextBillingDate}T12:00:00Z`
    );
    if (!Number.isNaN(parsed.getTime())) {
      const billingUtc = Date.UTC(
        parsed.getUTCFullYear(),
        parsed.getUTCMonth(),
        parsed.getUTCDate()
      );
      if (billingUtc > todayUtc) return parsed;
    }
  }

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate())
  );
}

type SubscriptionRow = {
  id: string;
  user_id: string;
  mp_subscription_id: string | null;
  stripe_subscription_id: string | null;
  asaas_subscription_id: string | null;
  pagarme_subscription_id: string | null;
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
      'id, user_id, mp_subscription_id, stripe_subscription_id, asaas_subscription_id, pagarme_subscription_id, status, next_billing_date'
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
  const resumeBillingDate = resolveResumeBillingDate(row.next_billing_date);

  async function revertPause() {
    if (action !== 'pause') return;
    await supabase
      .from('subscriptions')
      .update({ status: row.status, updated_at: new Date().toISOString() })
      .eq('id', subscriptionId);
  }

  if (action === 'pause') {
    let markPaused = supabase
      .from('subscriptions')
      .update({ status: 'paused', updated_at: updates.updated_at })
      .eq('id', subscriptionId);
    if (options.userId) {
      markPaused = markPaused.eq('user_id', options.userId);
    }
    const { error: markPausedError } = await markPaused;
    if (markPausedError) return { error: markPausedError.message };
  }

  let pagarmeBillingPostponed = false;

  if (row.pagarme_subscription_id && PAGARME_CONFIGURED && action === 'cancel') {
    try {
      await cancelPagarmeSubscriptionBestEffort(row.pagarme_subscription_id);
    } catch (error) {
      console.error('Pagar.me subscription cancel:', error);
      return { error: 'Não foi possível cancelar no Pagar.me.' };
    }
  }

  if (
    row.pagarme_subscription_id &&
    PAGARME_CONFIGURED &&
    (action === 'pause' || action === 'resume')
  ) {
    try {
      if (action === 'pause') {
        await pausePagarmeSubscriptionBilling(row.pagarme_subscription_id);
        pagarmeBillingPostponed = true;
      } else {
        await resumePagarmeSubscriptionBilling(
          row.pagarme_subscription_id,
          resumeBillingDate
        );
      }
    } catch (error) {
      console.error('Pagar.me subscription pause/resume:', error);
      await revertPause();
      return {
        error:
          action === 'pause'
            ? 'Não foi possível pausar a cobrança no Pagar.me. A assinatura continua ativa.'
            : 'Não foi possível retomar a cobrança no Pagar.me. Tente novamente.',
      };
    }
  }

  if (row.asaas_subscription_id && ASAAS_CONFIGURED) {
    try {
      if (action === 'cancel') {
        await cancelAsaasSubscriptionBestEffort(row.asaas_subscription_id);
      } else if (action === 'pause') {
        await pauseAsaasSubscription(row.asaas_subscription_id);
      } else if (action === 'resume') {
        await resumeAsaasSubscription(row.asaas_subscription_id, resumeBillingDate);
      }
    } catch (error) {
      console.error('Asaas subscription update:', error);
      if (action === 'pause') {
        if (pagarmeBillingPostponed && row.pagarme_subscription_id) {
          try {
            await resumePagarmeSubscriptionBilling(
              row.pagarme_subscription_id,
              resumeBillingDate
            );
          } catch (restoreError) {
            console.error(
              'Pagar.me billing restore after Asaas pause failure:',
              restoreError
            );
          }
        }
        await revertPause();
      }
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
      await revertPause();
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
      await revertPause();
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

  if (action === 'cancel') {
    await cancelReferralForSubscription(supabase, subscriptionId);
    await cancelPendingRedemptionsForUser(supabase, row.user_id);
    await cleanupSubscriptionCyclesOnCancel(supabase, subscriptionId);
  }

  return {};
}
