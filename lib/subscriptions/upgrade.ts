import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanSlug } from '@/lib/checkout/plans';
import {
  isHigherPlanSlug,
  upgradeOptionsForSlug,
} from '@/lib/subscriptions/plan-tier';
import {
  resolveSubscriptionRecurringCharge,
  type PlanChargeRow,
  type SubscriptionRecurringContext,
} from '@/lib/subscriptions/recurring-charge';
import {
  updateAsaasSubscriptionDetails,
} from '@/lib/asaas/subscription-api';
import { createAdminClient } from '@/lib/supabase/admin';

type PlanRow = PlanChargeRow & {
  id: string;
};

type SubscriptionUpgradeRow = SubscriptionRecurringContext & {
  id: string;
  status: string;
  plans?: PlanRow | PlanRow[] | null;
  pending_plan?: PlanRow | PlanRow[] | null;
};

export type UpgradeOptionPricing = {
  slug: PlanSlug;
  name: string;
  totalCents: number;
  originalTotalCents: number;
  promoSummary: string | null;
};

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function subscriptionBillingContext(
  subscription: SubscriptionRecurringContext
): SubscriptionRecurringContext {
  return {
    promo_code: subscription.promo_code ?? null,
    shipping_cents: subscription.shipping_cents ?? null,
    special_notes: subscription.special_notes ?? null,
  };
}

async function resolveRecurringChargeForPlan(
  plan: PlanChargeRow,
  context: SubscriptionRecurringContext
) {
  const admin = createAdminClient();
  return resolveSubscriptionRecurringCharge(
    admin,
    plan,
    subscriptionBillingContext(context)
  );
}

export async function buildUpgradeOptionsPricing(
  subscription: SubscriptionUpgradeRow
): Promise<UpgradeOptionPricing[]> {
  const currentPlan = relOne(subscription.plans);
  const currentSlug = currentPlan?.slug as PlanSlug | undefined;

  if (!currentSlug || subscription.status !== 'active') {
    return [];
  }

  const context = subscriptionBillingContext(subscription);
  const admin = createAdminClient();

  const options = await Promise.all(
    upgradeOptionsForSlug(currentSlug).map(async (slug) => {
      const { data: targetPlan } = await admin
        .from('plans')
        .select('slug, name, price_cents')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (!targetPlan) return null;

      const [charge, fullCharge] = await Promise.all([
        resolveSubscriptionRecurringCharge(admin, targetPlan, context),
        resolveSubscriptionRecurringCharge(admin, targetPlan, {
          ...context,
          promo_code: null,
        }),
      ]);

      return {
        slug,
        name: targetPlan.name,
        totalCents: charge.totalCents,
        originalTotalCents: fullCharge.totalCents,
        promoSummary: charge.promoSummary,
      } satisfies UpgradeOptionPricing;
    })
  );

  return options.filter((option): option is UpgradeOptionPricing => option !== null);
}

export async function resolvePendingUpgradePricing(
  subscription: SubscriptionUpgradeRow
): Promise<{ totalCents: number; promoSummary: string | null } | null> {
  const pendingPlan = relOne(subscription.pending_plan);
  if (!pendingPlan) return null;

  const charge = await resolveRecurringChargeForPlan(
    pendingPlan,
    subscription
  );

  return {
    totalCents: charge.totalCents,
    promoSummary: charge.promoSummary,
  };
}

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
    .select(
      'id, status, asaas_subscription_id, plan_id, promo_code, shipping_cents, special_notes, plans!plan_id(*)'
    )
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

  const currentPlan = relOne(subscription.plans as PlanRow | PlanRow[] | null);

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

  const admin = createAdminClient();
  const { data: targetPlan, error: targetError } = await admin
    .from('plans')
    .select('id, slug, name, price_cents')
    .eq('slug', targetPlanSlug)
    .eq('is_active', true)
    .single();

  if (targetError || !targetPlan) {
    return { error: 'Plano de destino não encontrado.' };
  }

  const charge = await resolveSubscriptionRecurringCharge(
    admin,
    targetPlan,
    subscriptionBillingContext(subscription)
  );

  if (subscription.asaas_subscription_id) {
    try {
      await updateAsaasSubscriptionDetails(subscription.asaas_subscription_id, {
        valueCents: charge.totalCents,
        description: charge.description,
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
    .select(
      'id, pending_plan_id, asaas_subscription_id, plan_id, promo_code, shipping_cents, special_notes, plans!plan_id(*)'
    )
    .eq('id', subscriptionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!subscription?.pending_plan_id) {
    return { error: 'Não há upgrade agendado para esta assinatura.' };
  }

  const currentPlan = relOne(subscription.plans as PlanRow | PlanRow[] | null);

  if (subscription.asaas_subscription_id && currentPlan) {
    const charge = await resolveRecurringChargeForPlan(
      currentPlan,
      subscription
    );

    try {
      await updateAsaasSubscriptionDetails(subscription.asaas_subscription_id, {
        valueCents: charge.totalCents,
        description: charge.description,
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
