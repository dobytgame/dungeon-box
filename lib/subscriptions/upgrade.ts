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
import { reconcileAsaasSubscriptionPendingPayment } from '@/lib/asaas/upgrade-payment-sync';
import { logSubscriptionPlanChange } from '@/lib/subscriptions/plan-change-log';
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

export async function resolveCurrentSubscriptionRecurringPricing(
  subscription: SubscriptionUpgradeRow
): Promise<{
  totalCents: number;
  originalTotalCents: number;
  promoSummary: string | null;
} | null> {
  const currentPlan = relOne(subscription.plans);
  if (!currentPlan) return null;

  const admin = createAdminClient();
  const context = subscriptionBillingContext(subscription);
  const [charge, fullCharge] = await Promise.all([
    resolveSubscriptionRecurringCharge(admin, currentPlan, context),
    resolveSubscriptionRecurringCharge(admin, currentPlan, {
      ...context,
      promo_code: null,
    }),
  ]);

  return {
    totalCents: charge.totalCents,
    originalTotalCents: fullCharge.totalCents,
    promoSummary: charge.promoSummary,
  };
}

export type AppliedPlanUpgrade = {
  previousPlanName: string;
  newPlanName: string;
};

export async function applyPendingPlanUpgrade(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<AppliedPlanUpgrade | null> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(
      'id, user_id, pending_plan_id, plans!plan_id(id, name), pending_plan:plans!pending_plan_id(id, name)'
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription?.pending_plan_id) return null;

  const currentPlan = relOne(
    subscription.plans as { id: string; name: string } | { id: string; name: string }[] | null
  );
  const pendingPlan = relOne(
    subscription.pending_plan as { id: string; name: string } | { id: string; name: string }[] | null
  );

  if (!currentPlan?.name || !pendingPlan?.name || !currentPlan.id) {
    console.error('[upgrade] apply pending plan: plan names missing:', subscriptionId);
    return null;
  }

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
    return null;
  }

  if (subscription.user_id) {
    await logSubscriptionPlanChange(supabase, {
      subscriptionId,
      userId: subscription.user_id,
      fromPlanId: currentPlan.id,
      toPlanId: subscription.pending_plan_id,
      event: 'applied',
      actor: 'system',
      metadata: {
        fromPlanName: currentPlan.name,
        toPlanName: pendingPlan.name,
      },
    });
  }

  const admin = createAdminClient();
  void reconcileAsaasSubscriptionPendingPayment(admin, subscriptionId).catch(
    (err) => {
      console.warn('[upgrade] post-apply asaas billing sync failed:', err);
    }
  );

  return {
    previousPlanName: currentPlan.name,
    newPlanName: pendingPlan.name,
  };
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

  if (subscription.asaas_subscription_id) {
    const syncResult = await reconcileAsaasSubscriptionPendingPayment(
      admin,
      subscriptionId
    );
    if (syncResult === 'failed') {
      await supabase
        .from('subscriptions')
        .update({
          pending_plan_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId)
        .eq('user_id', userId);

      return {
        error:
          'Não foi possível atualizar a cobrança no Asaas. O upgrade não foi agendado — tente novamente ou fale com o suporte.',
      };
    }
    if (syncResult === 'skipped') {
      console.warn('[upgrade] pending payment sync skipped after schedule:', {
        subscriptionId,
        expectedCents: charge.totalCents,
      });
    }
  }

  await logSubscriptionPlanChange(supabase, {
    subscriptionId,
    userId,
    fromPlanId: currentPlan.id,
    toPlanId: targetPlan.id,
    event: 'scheduled',
    actor: 'user',
    actorId: userId,
    metadata: {
      fromPlanName: currentPlan.name,
      toPlanName: targetPlan.name,
      recurringTotalCents: charge.totalCents,
    },
  });

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
      'id, user_id, pending_plan_id, asaas_subscription_id, plan_id, promo_code, shipping_cents, special_notes, plans!plan_id(id, name), pending_plan:plans!pending_plan_id(id, name)'
    )
    .eq('id', subscriptionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!subscription?.pending_plan_id) {
    return { error: 'Não há upgrade agendado para esta assinatura.' };
  }

  const currentPlan = relOne(subscription.plans as PlanRow | PlanRow[] | null);
  const pendingPlan = relOne(
    subscription.pending_plan as PlanRow | PlanRow[] | null
  );

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

  await logSubscriptionPlanChange(supabase, {
    subscriptionId,
    userId,
    fromPlanId: currentPlan?.id ?? subscription.plan_id ?? null,
    toPlanId: subscription.pending_plan_id,
    event: 'cancelled',
    actor: 'user',
    actorId: userId,
    metadata: {
      fromPlanName: currentPlan?.name ?? null,
      toPlanName: pendingPlan?.name ?? null,
    },
  });

  if (subscription.asaas_subscription_id) {
    const admin = createAdminClient();
    await reconcileAsaasSubscriptionPendingPayment(admin, subscriptionId);
  }

  return { success: true };
}
