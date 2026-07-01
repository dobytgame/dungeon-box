import type { SupabaseClient } from '@supabase/supabase-js';
import { asaasRequest } from '@/lib/asaas/client';
import { parseComboPaymentReference } from '@/lib/asaas/combo-payment';
import {
  normalizeAsaasSubscriptionRef,
  parseSubscriptionExternalReference,
} from '@/lib/asaas/refs';

type AsaasSubscriptionMeta = {
  id: string;
  status?: string;
  externalReference?: string | null;
};

type PaymentWithSubscription = {
  subscription?: string | { id?: string } | null;
  externalReference?: string | null;
};

export async function fetchAsaasSubscriptionMeta(
  asaasSubscriptionId: string
): Promise<AsaasSubscriptionMeta> {
  return asaasRequest<AsaasSubscriptionMeta>(
    `/subscriptions/${asaasSubscriptionId}`
  );
}

export function paymentExternalReferenceMatchesSubscription(
  externalReference: string | null | undefined,
  subscriptionId: string
): boolean {
  if (parseSubscriptionExternalReference(externalReference) === subscriptionId) {
    return true;
  }
  return parseComboPaymentReference(externalReference) === subscriptionId;
}

export function paymentAsaasSubscriptionIdMatches(
  payment: PaymentWithSubscription,
  asaasSubscriptionId: string | null | undefined
): boolean {
  if (!asaasSubscriptionId) return false;
  return (
    normalizeAsaasSubscriptionRef(payment.subscription) === asaasSubscriptionId
  );
}

export async function resolveLocalSubscriptionIdFromAsaasSubscription(
  asaasSubscriptionId: string
): Promise<string | null> {
  try {
    const remote = await fetchAsaasSubscriptionMeta(asaasSubscriptionId);
    return parseSubscriptionExternalReference(remote.externalReference);
  } catch (error) {
    console.error('[asaas] resolve subscription external ref:', asaasSubscriptionId, error);
    return null;
  }
}

/** Garante `asaas_subscription_id` local a partir das cobranças do cliente no Asaas. */
export async function backfillAsaasSubscriptionId(
  supabase: SupabaseClient,
  subscription: {
    id: string;
    asaas_subscription_id?: string | null;
  },
  customerPayments: PaymentWithSubscription[]
): Promise<string | null> {
  if (subscription.asaas_subscription_id) {
    return subscription.asaas_subscription_id;
  }

  const seen = new Set<string>();

  for (const payment of customerPayments) {
    const asaasSubId = normalizeAsaasSubscriptionRef(payment.subscription);
    if (!asaasSubId || seen.has(asaasSubId)) continue;
    seen.add(asaasSubId);

    const localId = await resolveLocalSubscriptionIdFromAsaasSubscription(
      asaasSubId
    );
    if (localId !== subscription.id) continue;

    await supabase
      .from('subscriptions')
      .update({
        asaas_subscription_id: asaasSubId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    return asaasSubId;
  }

  return null;
}

export async function paymentBelongsToLocalSubscription(
  payment: PaymentWithSubscription,
  subscription: {
    id: string;
    asaas_subscription_id?: string | null;
  }
): Promise<boolean> {
  if (paymentExternalReferenceMatchesSubscription(payment.externalReference, subscription.id)) {
    return true;
  }

  if (paymentAsaasSubscriptionIdMatches(payment, subscription.asaas_subscription_id)) {
    return true;
  }

  const asaasSubId = normalizeAsaasSubscriptionRef(payment.subscription);
  if (!asaasSubId) return false;

  const localId = await resolveLocalSubscriptionIdFromAsaasSubscription(asaasSubId);
  return localId === subscription.id;
}
