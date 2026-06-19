import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanSlug } from '@/lib/checkout/plans';
import {
  isHigherPlanSlug,
  upgradeOptionsForSlug,
} from '@/lib/subscriptions/plan-tier';
import {
  updateAsaasSubscriptionDetails,
} from '@/lib/asaas/subscription-api';

type PlanRow = {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
};

export async function applyPendingPlanUpgrade(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<boolean> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, pending_plan_id')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription?.pending_plan_id) return false;

  const { error } = await supabase
    .from('subscriptions')
    .update({
      plan_id: subscription.pending_plan_id,
      pending_plan_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId);

  if (error) {
    console.error('[upgrade] apply pending plan:', error);
    return false;
  }

  return true;
}

export async function scheduleSubscriptionUpgrade(
  supabase: SupabaseClient,
  userId: string,
  subscriptionId: string,
  targetPlanSlug: PlanSlug
): Promise<{ success: true } | { error: string }> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, status, asaas_subscription_id, plan_id, plans!plan_id(*)')
    .eq('id', subscriptionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!subscription) {
    return { error: 'Assinatura não encontrada.' };
  }

  if (subscription.status !== 'active') {
    return {
      error: 'Só é possível fazer upgrade de assinaturas ativas.',
    };
  }

  const currentPlan = Array.isArray(subscription.plans)
    ? subscription.plans[0]
    : subscription.plans;

  if (!currentPlan?.slug) {
    return { error: 'Plano atual não encontrado.' };
  }

  const currentSlug = currentPlan.slug as PlanSlug;
  if (!isHigherPlanSlug(targetPlanSlug, currentSlug)) {
    return { error: 'Selecione um plano superior ao atual.' };
  }

  const allowed = upgradeOptionsForSlug(currentSlug);
  if (!allowed.includes(targetPlanSlug)) {
    return { error: 'Upgrade inválido para este plano.' };
  }

  const { data: targetPlan, error: targetError } = await supabase
    .from('plans')
    .select('id, slug, name, price_cents')
    .eq('slug', targetPlanSlug)
    .eq('is_active', true)
    .single();

  if (targetError || !targetPlan) {
    return { error: 'Plano de destino não encontrado.' };
  }

  if (subscription.asaas_subscription_id) {
    try {
      await updateAsaasSubscriptionDetails(subscription.asaas_subscription_id, {
        valueCents: targetPlan.price_cents,
        description: `DungeonBox — ${targetPlan.name}`,
      });
    } catch (error) {
      console.error('[upgrade] asaas update:', error);
      return {
        error:
          'Não foi possível agendar o upgrade no gateway de pagamento. Tente novamente.',
      };
    }
  }

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      pending_plan_id: targetPlan.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .eq('user_id', userId);

  if (updateError) {
    return { error: updateError.message };
  }

  return { success: true };
}

export async function cancelPendingSubscriptionUpgrade(
  supabase: SupabaseClient,
  userId: string,
  subscriptionId: string
): Promise<{ success: true } | { error: string }> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, pending_plan_id, asaas_subscription_id, plan_id, plans!plan_id(*)')
    .eq('id', subscriptionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!subscription?.pending_plan_id) {
    return { error: 'Não há upgrade agendado para esta assinatura.' };
  }

  const currentPlan = Array.isArray(subscription.plans)
    ? subscription.plans[0]
    : subscription.plans;

  if (subscription.asaas_subscription_id && currentPlan) {
    try {
      await updateAsaasSubscriptionDetails(subscription.asaas_subscription_id, {
        valueCents: (currentPlan as PlanRow).price_cents,
        description: `DungeonBox — ${(currentPlan as PlanRow).name}`,
      });
    } catch (error) {
      console.error('[upgrade] asaas revert:', error);
      return {
        error:
          'Não foi possível cancelar o upgrade no gateway de pagamento. Tente novamente.',
      };
    }
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      pending_plan_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .eq('user_id', userId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
