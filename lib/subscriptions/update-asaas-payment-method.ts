import type { SupabaseClient } from '@supabase/supabase-js';
import { updateAsaasSubscriptionCreditCard } from '@/lib/asaas/update-subscription-credit-card';
import type {
  AsaasCreditCardHolderInput,
  AsaasCreditCardInput,
} from '@/lib/asaas/subscription-checkout';

const UPDATABLE_STATUSES = new Set(['active', 'past_due', 'paused']);

export type UpdateAsaasPaymentMethodInput = {
  supabase: SupabaseClient;
  userId: string;
  subscriptionId: string;
  creditCard: AsaasCreditCardInput;
  creditCardHolderInfo: AsaasCreditCardHolderInput;
  remoteIp: string;
};

export async function updateAsaasSubscriptionPaymentMethod(
  input: UpdateAsaasPaymentMethodInput
): Promise<{ success: true } | { error: string }> {
  const { data: subscription, error: subscriptionError } = await input.supabase
    .from('subscriptions')
    .select('id, status, asaas_subscription_id')
    .eq('id', input.subscriptionId)
    .eq('user_id', input.userId)
    .maybeSingle();

  if (subscriptionError || !subscription) {
    return { error: 'Assinatura não encontrada.' };
  }

  if (!UPDATABLE_STATUSES.has(subscription.status)) {
    return {
      error: 'Só é possível trocar o cartão de assinaturas ativas, pausadas ou em atraso.',
    };
  }

  if (!subscription.asaas_subscription_id) {
    return {
      error: 'Esta assinatura não está vinculada ao Asaas. Entre em contato com o suporte.',
    };
  }

  try {
    await updateAsaasSubscriptionCreditCard(subscription.asaas_subscription_id, {
      creditCard: input.creditCard,
      creditCardHolderInfo: input.creditCardHolderInfo,
      remoteIp: input.remoteIp,
    });
  } catch (error) {
    console.error('[asaas] update subscription credit card:', error);
    throw error;
  }

  return { success: true };
}
