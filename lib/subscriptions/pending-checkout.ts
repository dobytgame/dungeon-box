import type { SupabaseClient } from '@supabase/supabase-js';
import { cancelAsaasSubscriptionBestEffort } from '@/lib/asaas/subscription-api';
import { ASAAS_CONFIGURED } from '@/lib/asaas/client';
import { MP_CONFIGURED, updateMpPreapprovalStatus } from '@/lib/mercadopago';
import { fetchMpPreapproval } from '@/lib/mercadopago/safe-fetch';
import { activateSubscriptionFromMp } from '@/lib/subscriptions/activate';
import { activateSubscriptionFromStripe } from '@/lib/subscriptions/activate-stripe';
import { getStripe, STRIPE_CONFIGURED } from '@/lib/stripe/server';
import { cancelStripeSubscriptionBestEffort } from '@/lib/stripe/subscription-checkout';

export type ExistingSubscriptionRow = {
  id: string;
  status: string;
  mp_subscription_id: string | null;
  stripe_subscription_id: string | null;
  asaas_subscription_id: string | null;
};

export type CheckoutSubscriptionPrep =
  | { kind: 'create' }
  | { kind: 'retry'; subscriptionId: string }
  | {
      kind: 'blocked';
      message: string;
      code: 'SUBSCRIPTION_EXISTS' | 'SUBSCRIPTION_PAST_DUE';
    }
  | { kind: 'activated'; subscriptionId: string };

async function cancelMpPreapprovalBestEffort(mpSubscriptionId: string) {
  if (!MP_CONFIGURED) return;
  try {
    await updateMpPreapprovalStatus(mpSubscriptionId, 'cancelled');
  } catch (error) {
    console.warn('[mp] could not cancel stale preapproval:', mpSubscriptionId, error);
  }
}

async function syncStaleStripePending(
  supabase: SupabaseClient,
  existing: ExistingSubscriptionRow
): Promise<'activated' | 'cleared' | 'unchanged'> {
  if (!existing.stripe_subscription_id || !STRIPE_CONFIGURED) {
    return 'unchanged';
  }

  try {
    const stripe = getStripe();
    const stripeSub = await stripe.subscriptions.retrieve(
      existing.stripe_subscription_id
    );

    if (stripeSub.status === 'active' || stripeSub.status === 'trialing') {
      const activated = await activateSubscriptionFromStripe(
        supabase,
        existing.id,
        stripeSub
      );
      if (activated) return 'activated';
    }

    if (
      stripeSub.status === 'incomplete' ||
      stripeSub.status === 'incomplete_expired' ||
      stripeSub.status === 'canceled'
    ) {
      await cancelStripeSubscriptionBestEffort(existing.stripe_subscription_id);
      return 'cleared';
    }
  } catch (error) {
    console.warn(
      '[stripe] stale pending subscription — sync skipped, will replace:',
      existing.stripe_subscription_id,
      error
    );
    return 'cleared';
  }

  return 'unchanged';
}

/**
 * Resolves an existing subscription before checkout: block active/paused,
 * sync or replace stale pending, allow retry with the same row.
 */
export async function prepareCheckoutSubscription(
  supabase: SupabaseClient,
  existing: ExistingSubscriptionRow | null
): Promise<CheckoutSubscriptionPrep> {
  if (!existing) {
    return { kind: 'create' };
  }

  if (existing.status === 'active' || existing.status === 'paused') {
    return {
      kind: 'blocked',
      code: 'SUBSCRIPTION_EXISTS',
      message: 'Você já possui uma assinatura ativa.',
    };
  }

  if (existing.status === 'past_due') {
    return {
      kind: 'blocked',
      code: 'SUBSCRIPTION_PAST_DUE',
      message:
        'Sua assinatura está com pagamento em atraso. Regularize em Minha conta antes de assinar novamente.',
    };
  }

  if (existing.status !== 'pending') {
    return {
      kind: 'blocked',
      code: 'SUBSCRIPTION_EXISTS',
      message: 'Já existe uma assinatura em andamento. Acesse sua conta.',
    };
  }

  if (existing.stripe_subscription_id) {
    const stripeResult = await syncStaleStripePending(supabase, existing);
    if (stripeResult === 'activated') {
      return { kind: 'activated', subscriptionId: existing.id };
    }
  }

  if (existing.asaas_subscription_id && ASAAS_CONFIGURED) {
    await cancelAsaasSubscriptionBestEffort(existing.asaas_subscription_id);
  }

  if (existing.mp_subscription_id) {
    const mp = await fetchMpPreapproval(existing.mp_subscription_id);

    if (mp) {
      const mpStatus = typeof mp.status === 'string' ? mp.status : null;

      if (mpStatus === 'authorized') {
        const activated = await activateSubscriptionFromMp(supabase, existing.id, {
          status: mpStatus,
          payer_id: mp.payer_id as string | number | null | undefined,
        });
        if (activated) {
          return { kind: 'activated', subscriptionId: existing.id };
        }
      }

      await cancelMpPreapprovalBestEffort(existing.mp_subscription_id);
    } else {
      console.warn(
        '[mp] stale pending subscription — MP sync skipped, will replace mp_subscription_id:',
        existing.mp_subscription_id
      );
    }
  }

  return { kind: 'retry', subscriptionId: existing.id };
}
