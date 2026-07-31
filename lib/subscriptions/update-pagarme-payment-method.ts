import type { SupabaseClient } from '@supabase/supabase-js';
import { updatePagarmeSubscriptionCard } from '@/lib/pagarme/subscription-api';
import type { PagarmeBillingAddressInput } from '@/lib/pagarme/subscription-checkout';

const UPDATABLE_STATUSES = new Set(['active', 'past_due', 'paused']);

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
    .select('id, status, pagarme_subscription_id')
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

  try {
    await updatePagarmeSubscriptionCard(subscription.pagarme_subscription_id, {
      cardToken: input.cardToken,
      billingAddress: input.billingAddress,
    });
  } catch (error) {
    console.error('[pagarme] update subscription card:', error);
    throw error;
  }

  await input.supabase
    .from('subscriptions')
    .update({
      card_last4: input.cardLast4,
      card_brand: input.cardBrand,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.subscriptionId);

  return { success: true };
}
