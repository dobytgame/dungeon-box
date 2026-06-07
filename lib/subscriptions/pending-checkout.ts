import type { SupabaseClient } from '@supabase/supabase-js';
import { MP_CONFIGURED, updateMpPreapprovalStatus } from '@/lib/mercadopago';
import { fetchMpPreapproval } from '@/lib/mercadopago/safe-fetch';
import { activateSubscriptionFromMp } from '@/lib/subscriptions/activate';

export type ExistingSubscriptionRow = {
  id: string;
  status: string;
  mp_subscription_id: string | null;
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
