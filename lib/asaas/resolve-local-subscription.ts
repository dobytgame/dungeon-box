import type { SupabaseClient } from '@supabase/supabase-js';
import { asaasRequest } from '@/lib/asaas/client';
import {
  normalizeAsaasSubscriptionRef,
  parseSubscriptionExternalReference,
} from '@/lib/asaas/refs';
import type { AsaasWebhookPayment } from '@/lib/asaas/webhook-handlers';

type LocalSubscription = {
  id: string;
  status: string;
  started_at: string | null;
  user_id: string;
  current_cycle: number | null;
  asaas_subscription_id: string | null;
};

type AsaasSubscriptionResponse = {
  id: string;
  externalReference?: string | null;
};

async function findSubscriptionByAsaasId(
  supabase: SupabaseClient,
  asaasSubscriptionId: string
): Promise<LocalSubscription | null> {
  const { data } = await supabase
    .from('subscriptions')
    .select(
      'id, status, started_at, user_id, current_cycle, asaas_subscription_id'
    )
    .eq('asaas_subscription_id', asaasSubscriptionId)
    .maybeSingle();
  return data;
}

async function findSubscriptionByExternalReference(
  supabase: SupabaseClient,
  externalReference: string
): Promise<LocalSubscription | null> {
  const subscriptionId = parseSubscriptionExternalReference(externalReference);
  if (!subscriptionId) return null;

  const { data } = await supabase
    .from('subscriptions')
    .select(
      'id, status, started_at, user_id, current_cycle, asaas_subscription_id'
    )
    .eq('id', subscriptionId)
    .maybeSingle();
  return data;
}

async function fetchAsaasSubscription(
  asaasSubscriptionId: string
): Promise<AsaasSubscriptionResponse> {
  return asaasRequest<AsaasSubscriptionResponse>(
    `/subscriptions/${asaasSubscriptionId}`
  );
}

async function backfillAsaasSubscriptionLink(
  supabase: SupabaseClient,
  local: LocalSubscription,
  asaasSubscriptionId: string
): Promise<LocalSubscription> {
  if (local.asaas_subscription_id === asaasSubscriptionId) {
    return local;
  }

  await supabase
    .from('subscriptions')
    .update({
      asaas_subscription_id: asaasSubscriptionId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', local.id);

  return { ...local, asaas_subscription_id: asaasSubscriptionId };
}

/** Resolve assinatura local a partir do payload Asaas, com fallback na API. */
export async function resolveLocalAsaasSubscription(
  supabase: SupabaseClient,
  payment: AsaasWebhookPayment
): Promise<LocalSubscription | null> {
  const asaasSubscriptionId = normalizeAsaasSubscriptionRef(payment.subscription);

  if (asaasSubscriptionId) {
    const byAsaas = await findSubscriptionByAsaasId(supabase, asaasSubscriptionId);
    if (byAsaas) return byAsaas;
  }

  if (payment.externalReference) {
    const byRef = await findSubscriptionByExternalReference(
      supabase,
      payment.externalReference
    );
    if (byRef) {
      if (asaasSubscriptionId) {
        return backfillAsaasSubscriptionLink(
          supabase,
          byRef,
          asaasSubscriptionId
        );
      }
      return byRef;
    }
  }

  if (!asaasSubscriptionId) {
    return null;
  }

  try {
    const remote = await fetchAsaasSubscription(asaasSubscriptionId);
    if (!remote.externalReference) {
      return null;
    }

    const byRemoteRef = await findSubscriptionByExternalReference(
      supabase,
      remote.externalReference
    );
    if (!byRemoteRef) {
      return null;
    }

    return backfillAsaasSubscriptionLink(
      supabase,
      byRemoteRef,
      asaasSubscriptionId
    );
  } catch (error) {
    console.error('[asaas] resolve local subscription fallback:', error);
    return null;
  }
}

export async function findLocalSubscriptionByAsaasId(
  supabase: SupabaseClient,
  asaasSubscriptionId: string
): Promise<LocalSubscription | null> {
  const direct = await findSubscriptionByAsaasId(supabase, asaasSubscriptionId);
  if (direct) return direct;

  try {
    const remote = await fetchAsaasSubscription(asaasSubscriptionId);
    if (!remote.externalReference) {
      return null;
    }

    const byRef = await findSubscriptionByExternalReference(
      supabase,
      remote.externalReference
    );
    if (!byRef) {
      return null;
    }

    return backfillAsaasSubscriptionLink(
      supabase,
      byRef,
      asaasSubscriptionId
    );
  } catch (error) {
    console.error('[asaas] find local by asaas id fallback:', error);
    return null;
  }
}
