import type { SupabaseClient } from '@supabase/supabase-js';
import { createPagarmeCustomerCard } from '@/lib/pagarme/cards';
import {
  cancelOpenPagarmeSubscriptionInvoices,
  updatePagarmeSubscriptionCard,
} from '@/lib/pagarme/subscription-api';
import type { PagarmeBillingAddressInput } from '@/lib/pagarme/subscription-checkout';
import { pagarmeRequest } from '@/lib/pagarme/client';

const UPDATABLE_STATUSES = new Set(['active', 'past_due', 'paused']);

type PagarmeRemoteSubscription = {
  customer?: { id?: string | null } | null;
};

export async function updatePagarmeSubscriptionPaymentMethod(input: {
  supabase: SupabaseClient;
  userId: string;
  subscriptionId: string;
  cardToken: string;
  cardLast4: string;
  cardBrand: string;
  billingAddress: PagarmeBillingAddressInput;
}): Promise<{ success: true } | { error: string }> {
  const { data: subscription, error: subscriptionError } = await input.supabase
    .from('subscriptions')
    .select('id, status, pagarme_subscription_id, pagarme_customer_id')
    .eq('id', input.subscriptionId)
    .eq('user_id', input.userId)
    .maybeSingle();

  if (subscriptionError || !subscription) {
    return { error: 'Assinatura não encontrada.' };
  }

  if (!UPDATABLE_STATUSES.has(subscription.status)) {
    return {
      error:
        'Só é possível trocar o cartão de assinaturas ativas, pausadas ou em atraso.',
    };
  }

  if (!subscription.pagarme_subscription_id) {
    return {
      error:
        'Esta assinatura não está vinculada ao Pagar.me. Entre em contato com o suporte.',
    };
  }

  let pagarmeCustomerId = subscription.pagarme_customer_id?.trim() || null;
  if (!pagarmeCustomerId) {
    const { data: profile } = await input.supabase
      .from('profiles')
      .select('pagarme_customer_id')
      .eq('id', input.userId)
      .maybeSingle();
    pagarmeCustomerId = profile?.pagarme_customer_id?.trim() || null;
  }
  if (!pagarmeCustomerId) {
    try {
      const remote = await pagarmeRequest<PagarmeRemoteSubscription>(
        `/subscriptions/${encodeURIComponent(subscription.pagarme_subscription_id)}`
      );
      pagarmeCustomerId = remote.customer?.id?.trim() || null;
    } catch (error) {
      console.warn('[pagarme] resolve customer for card update:', error);
    }
  }

  if (!pagarmeCustomerId) {
    return {
      error:
        'Não foi possível localizar o cliente no Pagar.me. Entre em contato com o suporte.',
    };
  }

  try {
    const savedCard = await createPagarmeCustomerCard({
      customerId: pagarmeCustomerId,
      cardToken: input.cardToken,
      billingAddress: input.billingAddress,
    });

    await updatePagarmeSubscriptionCard(subscription.pagarme_subscription_id, {
      cardId: savedCard.id,
    });

    await cancelOpenPagarmeSubscriptionInvoices(subscription.pagarme_subscription_id);
  } catch (error) {
    console.error('[pagarme] update subscription card:', error);
    throw error;
  }

  await input.supabase
    .from('subscriptions')
    .update({
      pagarme_customer_id: pagarmeCustomerId,
      card_last4: input.cardLast4,
      card_brand: input.cardBrand,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.subscriptionId);

  return { success: true };
}
