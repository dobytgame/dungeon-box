import type { SupabaseClient } from '@supabase/supabase-js';
import { chargeAsaasOneTimePayment } from '@/lib/asaas/one-time-payment';
import { isAsaasPaymentConfirmed } from '@/lib/asaas/payment-status';
import { updateAsaasSubscriptionDetails } from '@/lib/asaas/subscription-api';
import type {
  AsaasCreditCardHolderInput,
  AsaasCreditCardInput,
} from '@/lib/asaas/subscription-checkout';
import { getOrCreateAsaasCustomer } from '@/lib/asaas/customer';
import type { AsaasWebhookPayment } from '@/lib/asaas/webhook-handlers';
import {
  calculateComboTotalCents,
  COMBO_BILLING_ENABLED,
  COMBO_MAX_INSTALLMENTS,
  comboInterestFreeMax,
  comboInstallmentLabel,
  isComboTerm,
  prepaidMonthsForTerm,
  type BillingTerm,
} from '@/lib/checkout/combo-billing';
import type { CheckoutData } from '@/lib/checkout/types';
import type { PlanSlug } from '@/lib/checkout/plans';
import {
  parsePaintKitBump,
  parsePaintKitBumpRecurring,
} from '@/lib/checkout/special-notes';
import { getOrCreatePagarmeCustomer } from '@/lib/pagarme/customer';
import {
  assertPagarmeCreditCardOrderPaid,
  chargePagarmeOneTimeOrder,
  isPagarmeChargePaid,
  resolvePagarmeOrderChargeIds,
} from '@/lib/pagarme/one-time-order';
import { syncPagarmeSubscriptionRecurringPrice } from '@/lib/pagarme/sync-recurring-price';
import type { PagarmeBillingAddressInput } from '@/lib/pagarme/subscription-checkout';
import { buildPagarmeSubscriptionComboTierCode } from '@/lib/pagarme/store-order-code';
import { logSubscriptionPlanChange } from '@/lib/subscriptions/plan-change-log';
import {
  isHigherPlanSlug,
  upgradeOptionsForSlug,
} from '@/lib/subscriptions/plan-tier';
import {
  resolveSubscriptionRecurringCharge,
  type SubscriptionRecurringContext,
} from '@/lib/subscriptions/recurring-charge';
import { createAdminClient } from '@/lib/supabase/admin';

type PlanRow = {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
};

export type SubscriptionComboTierUpgradeRow = SubscriptionRecurringContext & {
  id: string;
  user_id: string;
  status: string;
  plan_id?: string | null;
  address_id?: string | null;
  asaas_subscription_id?: string | null;
  asaas_customer_id?: string | null;
  pagarme_subscription_id?: string | null;
  pagarme_customer_id?: string | null;
  pending_plan_id?: string | null;
  pending_billing_term?: string | null;
  billing_term?: string | null;
  shipping_region?: string | null;
  prepaid_months?: number | null;
  prepaid_until?: string | null;
  combo_total_cents?: number | null;
  combo_installments?: number | null;
  current_cycle?: number | null;
  loyalty_level?: number | null;
  is_partner?: boolean | null;
  plans?: PlanRow | PlanRow[] | null;
};

export type ComboTierUpgradeOptionPricing = {
  slug: PlanSlug;
  name: string;
  billingTerm: Exclude<BillingTerm, 'monthly'>;
  remainingMonths: number;
  totalPrepaidMonths: number;
  currentComboTotalCents: number;
  targetComboTotalCents: number;
  differenceCents: number;
  installmentLabel: string;
  interestFreeMax: number;
};

const CONSUMED_CYCLE_STATUSES = new Set([
  'shipped',
  'delivered',
  'cancelled',
]);

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Diferença pró-rata dos meses restantes do combo. */
export function calculateComboTierUpgradeDifferenceCents(input: {
  currentComboTotalCents: number;
  targetComboTotalCents: number;
  totalPrepaidMonths: number;
  remainingMonths: number;
}): number {
  const {
    currentComboTotalCents,
    targetComboTotalCents,
    totalPrepaidMonths,
    remainingMonths,
  } = input;

  if (totalPrepaidMonths <= 0 || remainingMonths <= 0) return 0;

  const delta = targetComboTotalCents - currentComboTotalCents;
  if (delta <= 0) return 0;

  const cappedRemaining = Math.min(remainingMonths, totalPrepaidMonths);
  return Math.max(
    0,
    Math.round((delta * cappedRemaining) / totalPrepaidMonths)
  );
}

/** Meses restantes até o fim do pré-pago (fallback sem ciclos). */
export function remainingMonthsUntilPrepaid(
  prepaidUntil: Date,
  now: Date = new Date()
): number {
  if (prepaidUntil.getTime() <= now.getTime()) return 0;
  const msPerMonth = 30.4375 * 24 * 60 * 60 * 1000;
  return Math.max(1, Math.ceil((prepaidUntil.getTime() - now.getTime()) / msPerMonth));
}

export function isActivePrepaidCombo(
  subscription: Pick<
    SubscriptionComboTierUpgradeRow,
    'status' | 'billing_term' | 'prepaid_until' | 'is_partner'
  >
): boolean {
  if (subscription.is_partner) return false;
  if (subscription.status !== 'active') return false;

  const term = (subscription.billing_term ?? 'monthly') as BillingTerm;
  if (!isComboTerm(term)) return false;

  if (!subscription.prepaid_until) return false;
  return new Date(subscription.prepaid_until) > new Date();
}

function buildCheckoutDataFromSubscription(
  subscription: SubscriptionComboTierUpgradeRow,
  plan: PlanRow,
  billingTerm: Exclude<BillingTerm, 'monthly'>,
  planCents: number,
  shippingCents: number
): CheckoutData {
  const planSlug = plan.slug as PlanSlug;

  return {
    planSlugs: [planSlug],
    billingTerm,
    installmentCount: 1,
    paintKitBump: parsePaintKitBump(subscription.special_notes),
    paintKitBumpRecurring: parsePaintKitBumpRecurring(subscription.special_notes),
    addressId: subscription.address_id ?? '',
    specialNotes: '',
    discountedPlanCentsByPlan: { [planSlug]: planCents },
    shippingByPlan: {
      [planSlug]: {
        cents: shippingCents,
        free: shippingCents === 0,
        region: subscription.shipping_region ?? '',
        label: subscription.shipping_region ?? '',
        etaDaysMin: 0,
        etaDaysMax: 0,
      },
    },
  };
}

export async function resolveRemainingComboMonths(
  supabase: SupabaseClient,
  subscription: SubscriptionComboTierUpgradeRow
): Promise<number> {
  const term = (subscription.billing_term ?? 'monthly') as BillingTerm;
  if (!isComboTerm(term)) return 0;

  const totalMonths =
    subscription.prepaid_months ?? prepaidMonthsForTerm(term) ?? 0;
  if (totalMonths <= 0) return 0;

  const { data: cycles, error } = await supabase
    .from('subscription_cycles')
    .select('status')
    .eq('subscription_id', subscription.id);

  if (!error && cycles && cycles.length > 0) {
    const remaining = cycles.filter(
      (cycle) => !CONSUMED_CYCLE_STATUSES.has(String(cycle.status ?? ''))
    ).length;
    return Math.min(Math.max(0, remaining), totalMonths);
  }

  if (!subscription.prepaid_until) return 0;
  return Math.min(
    remainingMonthsUntilPrepaid(new Date(subscription.prepaid_until)),
    totalMonths
  );
}

async function resolveTargetComboTotalCents(
  subscription: SubscriptionComboTierUpgradeRow,
  targetPlan: PlanRow,
  billingTerm: Exclude<BillingTerm, 'monthly'>
): Promise<number> {
  const checkoutData = buildCheckoutDataFromSubscription(
    subscription,
    targetPlan,
    billingTerm,
    targetPlan.price_cents,
    subscription.shipping_cents ?? 0
  );
  return calculateComboTotalCents(checkoutData, billingTerm);
}

async function resolveCurrentComboTotalCents(
  subscription: SubscriptionComboTierUpgradeRow,
  currentPlan: PlanRow,
  billingTerm: Exclude<BillingTerm, 'monthly'>
): Promise<number> {
  if (
    subscription.combo_total_cents != null &&
    subscription.combo_total_cents > 0
  ) {
    return subscription.combo_total_cents;
  }

  const checkoutData = buildCheckoutDataFromSubscription(
    subscription,
    currentPlan,
    billingTerm,
    currentPlan.price_cents,
    subscription.shipping_cents ?? 0
  );
  return calculateComboTotalCents(checkoutData, billingTerm);
}

export function canUpgradeComboPlanTier(
  subscription: SubscriptionComboTierUpgradeRow
): boolean {
  if (!COMBO_BILLING_ENABLED) return false;
  if (!isActivePrepaidCombo(subscription)) return false;
  if (subscription.pending_plan_id || subscription.pending_billing_term) {
    return false;
  }

  const hasGatewayCustomer = Boolean(
    subscription.asaas_customer_id ||
      subscription.pagarme_customer_id ||
      subscription.asaas_subscription_id ||
      subscription.pagarme_subscription_id
  );
  if (!hasGatewayCustomer) return false;

  const currentPlan = relOne(subscription.plans);
  const currentSlug = currentPlan?.slug as PlanSlug | undefined;
  if (!currentSlug) return false;

  return upgradeOptionsForSlug(currentSlug).length > 0;
}

export async function buildComboTierUpgradeOptions(
  subscription: SubscriptionComboTierUpgradeRow
): Promise<ComboTierUpgradeOptionPricing[]> {
  if (!canUpgradeComboPlanTier(subscription)) return [];

  const currentPlan = relOne(subscription.plans);
  const currentSlug = currentPlan?.slug as PlanSlug | undefined;
  if (!currentPlan || !currentSlug) return [];

  const billingTerm = (subscription.billing_term ?? 'monthly') as BillingTerm;
  if (!isComboTerm(billingTerm)) return [];

  const admin = createAdminClient();
  const remainingMonths = await resolveRemainingComboMonths(admin, subscription);
  if (remainingMonths <= 0) return [];

  const totalPrepaidMonths =
    subscription.prepaid_months ?? prepaidMonthsForTerm(billingTerm) ?? 0;
  if (totalPrepaidMonths <= 0) return [];

  const currentComboTotalCents = await resolveCurrentComboTotalCents(
    subscription,
    currentPlan,
    billingTerm
  );

  const options = await Promise.all(
    upgradeOptionsForSlug(currentSlug).map(async (slug) => {
      const { data: targetPlan } = await admin
        .from('plans')
        .select('id, slug, name, price_cents')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (!targetPlan) return null;

      const targetComboTotalCents = await resolveTargetComboTotalCents(
        subscription,
        targetPlan,
        billingTerm
      );

      const differenceCents = calculateComboTierUpgradeDifferenceCents({
        currentComboTotalCents,
        targetComboTotalCents,
        totalPrepaidMonths,
        remainingMonths,
      });

      if (differenceCents <= 0) return null;

      const interestFreeMax = comboInterestFreeMax(slug, billingTerm);

      return {
        slug,
        name: targetPlan.name,
        billingTerm,
        remainingMonths,
        totalPrepaidMonths,
        currentComboTotalCents,
        targetComboTotalCents,
        differenceCents,
        installmentLabel: comboInstallmentLabel(1, interestFreeMax),
        interestFreeMax,
      } satisfies ComboTierUpgradeOptionPricing;
    })
  );

  return options.filter(
    (option): option is ComboTierUpgradeOptionPricing => option !== null
  );
}

async function syncDeferredRenewalPrice(
  supabase: SupabaseClient,
  subscription: SubscriptionComboTierUpgradeRow,
  targetPlan: PlanRow
): Promise<void> {
  const charge = await resolveSubscriptionRecurringCharge(
    supabase,
    targetPlan,
    {
      promo_code: subscription.promo_code ?? null,
      shipping_cents: subscription.shipping_cents ?? null,
      special_notes: subscription.special_notes ?? null,
    }
  );

  if (subscription.asaas_subscription_id) {
    try {
      await updateAsaasSubscriptionDetails(subscription.asaas_subscription_id, {
        valueCents: charge.totalCents,
        description: `DungeonBox — ${charge.description} (renovação mensal)`,
        updatePendingPayments: true,
      });
    } catch (error) {
      console.error(
        '[combo-tier-upgrade] asaas deferred price sync failed:',
        error
      );
    }
  }

  if (subscription.pagarme_subscription_id) {
    try {
      await syncPagarmeSubscriptionRecurringPrice(supabase, subscription.id);
    } catch (error) {
      console.error(
        '[combo-tier-upgrade] pagarme deferred price sync failed:',
        error
      );
    }
  }
}

export async function applyComboTierUpgradeAfterPayment(
  supabase: SupabaseClient,
  subscriptionId: string,
  payment: {
    id: string;
    amountCents: number;
    paidAt: string;
    installments: number;
  }
): Promise<boolean> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(
      `id, user_id, plan_id, status, billing_term, pending_plan_id, pending_billing_term,
       combo_total_cents, combo_installments, prepaid_months, prepaid_until,
       asaas_subscription_id, asaas_customer_id, pagarme_subscription_id, pagarme_customer_id,
       promo_code, shipping_cents, special_notes, shipping_region, current_cycle, loyalty_level,
       plans!plan_id(id, slug, name, price_cents),
       pending_plan:plans!pending_plan_id(id, slug, name, price_cents)`
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription) return false;
  if (subscription.status !== 'active' || !subscription.pending_plan_id) {
    return false;
  }

  const term = (subscription.billing_term ?? 'monthly') as BillingTerm;
  if (!isComboTerm(term)) return false;

  const currentPlan = relOne(
    subscription.plans as PlanRow | PlanRow[] | null
  );
  const pendingPlan = relOne(
    subscription.pending_plan as PlanRow | PlanRow[] | null
  );

  if (!currentPlan?.id || !pendingPlan?.id || !pendingPlan.slug) {
    return false;
  }

  if (
    !isHigherPlanSlug(
      pendingPlan.slug as PlanSlug,
      currentPlan.slug as PlanSlug
    )
  ) {
    return false;
  }

  const previousComboTotal =
    subscription.combo_total_cents != null && subscription.combo_total_cents > 0
      ? subscription.combo_total_cents
      : 0;
  const nextComboTotal = previousComboTotal + Math.max(0, payment.amountCents);

  const now = new Date().toISOString();
  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      plan_id: subscription.pending_plan_id,
      pending_plan_id: null,
      combo_total_cents: nextComboTotal,
      updated_at: now,
    })
    .eq('id', subscriptionId)
    .eq('status', 'active')
    .eq('pending_plan_id', subscription.pending_plan_id);

  if (updateError) {
    console.error('[combo-tier-upgrade] apply update failed:', updateError);
    return false;
  }

  await syncDeferredRenewalPrice(supabase, subscription, pendingPlan);

  if (subscription.user_id) {
    await logSubscriptionPlanChange(supabase, {
      subscriptionId,
      userId: subscription.user_id,
      fromPlanId: currentPlan.id,
      toPlanId: subscription.pending_plan_id,
      event: 'applied',
      actor: 'user',
      metadata: {
        type: 'combo_tier_upgrade',
        billingTerm: term,
        differenceCents: payment.amountCents,
        previousComboTotalCents: previousComboTotal,
        nextComboTotalCents: nextComboTotal,
        preservedCycle: subscription.current_cycle,
        preservedLoyaltyLevel: subscription.loyalty_level,
        prepaidUntil: subscription.prepaid_until,
      },
    });
  }

  return true;
}

type ChargeContext = {
  subscription: SubscriptionComboTierUpgradeRow;
  currentPlan: PlanRow;
  targetPlan: PlanRow;
  billingTerm: Exclude<BillingTerm, 'monthly'>;
  differenceCents: number;
  remainingMonths: number;
  totalPrepaidMonths: number;
  currentComboTotalCents: number;
  targetComboTotalCents: number;
};

async function resolveChargeContext(
  supabase: SupabaseClient,
  userId: string,
  subscriptionId: string,
  targetPlanSlug: PlanSlug
): Promise<{ ok: true; context: ChargeContext } | { error: string }> {
  if (!COMBO_BILLING_ENABLED) {
    return { error: 'Combos indisponíveis no momento.' };
  }

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(
      `id, user_id, status, plan_id, address_id, asaas_subscription_id, asaas_customer_id,
       pagarme_subscription_id, pagarme_customer_id, pending_plan_id, pending_billing_term,
       billing_term, promo_code, shipping_cents, shipping_region, special_notes,
       prepaid_months, prepaid_until, combo_total_cents, combo_installments,
       current_cycle, loyalty_level, is_partner,
       plans!plan_id(id, slug, name, price_cents)`
    )
    .eq('id', subscriptionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!subscription) {
    return { error: 'Assinatura não encontrada.' };
  }

  if (!canUpgradeComboPlanTier(subscription)) {
    return {
      error:
        'Upgrade de combo disponível apenas para combos pré-pagos ativos sem pendências.',
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

  if (!upgradeOptionsForSlug(currentSlug).includes(targetPlanSlug)) {
    return { error: 'Upgrade inválido para este plano.' };
  }

  const billingTerm = (subscription.billing_term ?? 'monthly') as BillingTerm;
  if (!isComboTerm(billingTerm)) {
    return { error: 'Esta assinatura não é um combo.' };
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

  const remainingMonths = await resolveRemainingComboMonths(admin, subscription);
  if (remainingMonths <= 0) {
    return { error: 'Não há meses restantes neste combo para upgrade.' };
  }

  const totalPrepaidMonths =
    subscription.prepaid_months ?? prepaidMonthsForTerm(billingTerm) ?? 0;

  const currentComboTotalCents = await resolveCurrentComboTotalCents(
    subscription,
    currentPlan,
    billingTerm
  );
  const targetComboTotalCents = await resolveTargetComboTotalCents(
    subscription,
    targetPlan,
    billingTerm
  );

  const differenceCents = calculateComboTierUpgradeDifferenceCents({
    currentComboTotalCents,
    targetComboTotalCents,
    totalPrepaidMonths,
    remainingMonths,
  });

  if (differenceCents <= 0) {
    return { error: 'Não há diferença a cobrar para este upgrade.' };
  }

  return {
    ok: true,
    context: {
      subscription,
      currentPlan,
      targetPlan,
      billingTerm,
      differenceCents,
      remainingMonths,
      totalPrepaidMonths,
      currentComboTotalCents,
      targetComboTotalCents,
    },
  };
}

export async function upgradeComboPlanTierViaAsaas(input: {
  supabase: SupabaseClient;
  userId: string;
  subscriptionId: string;
  targetPlanSlug: PlanSlug;
  installmentCount: number;
  creditCard: AsaasCreditCardInput;
  creditCardHolderInfo: AsaasCreditCardHolderInput;
  remoteIp: string;
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    cpf: string | null;
    phone: string | null;
    asaas_customer_id: string | null;
  };
  address: {
    recipient: string;
    zip_code: string;
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
  };
}): Promise<{ success: true } | { error: string }> {
  const resolved = await resolveChargeContext(
    input.supabase,
    input.userId,
    input.subscriptionId,
    input.targetPlanSlug
  );
  if ('error' in resolved) return resolved;

  const {
    subscription,
    currentPlan,
    targetPlan,
    billingTerm,
    differenceCents,
    remainingMonths,
    totalPrepaidMonths,
    currentComboTotalCents,
    targetComboTotalCents,
  } = resolved.context;

  if (!subscription.asaas_subscription_id && !subscription.asaas_customer_id) {
    return {
      error:
        'Esta assinatura não está no Asaas. Use o pagamento Pagar.me para o upgrade.',
    };
  }

  const installmentCount = Math.min(
    Math.max(1, input.installmentCount),
    COMBO_MAX_INSTALLMENTS
  );

  const admin = createAdminClient();
  const asaasCustomerId = await getOrCreateAsaasCustomer(
    input.supabase,
    input.profile,
    input.address
  );

  const { error: pendingError } = await input.supabase
    .from('subscriptions')
    .update({
      pending_plan_id: targetPlan.id,
      asaas_customer_id: asaasCustomerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.subscriptionId)
    .eq('user_id', input.userId)
    .eq('status', 'active')
    .is('pending_plan_id', null);

  if (pendingError) {
    return { error: 'Não foi possível iniciar o upgrade do combo.' };
  }

  try {
    const tierPayment = await chargeAsaasOneTimePayment({
      customerId: asaasCustomerId,
      valueCents: differenceCents,
      description: `DungeonBox — Upgrade combo ${currentPlan.name} → ${targetPlan.name} (${remainingMonths} meses restantes)`,
      remoteIp: input.remoteIp,
      creditCard: input.creditCard,
      creditCardHolderInfo: input.creditCardHolderInfo,
      externalReference: `${input.subscriptionId}:combo-tier`,
      installmentCount,
      interestFreeMax: comboInterestFreeMax(
        targetPlan.slug as PlanSlug,
        billingTerm
      ),
    });

    const paidAt = isAsaasPaymentConfirmed(tierPayment.status)
      ? new Date().toISOString()
      : null;

    const { data: paymentRow } = await admin
      .from('payments')
      .upsert(
        {
          user_id: input.userId,
          subscription_id: input.subscriptionId,
          asaas_payment_id: tierPayment.id,
          amount_cents: differenceCents,
          currency: 'BRL',
          status: paidAt ? 'approved' : 'pending',
          paid_at: paidAt,
          installments: installmentCount,
          payment_method: 'credit_card',
          status_detail: JSON.stringify({
            type: 'combo_tier_upgrade',
            billing_term: billingTerm,
            from_plan: currentPlan.slug,
            to_plan: targetPlan.slug,
            remaining_months: remainingMonths,
            total_prepaid_months: totalPrepaidMonths,
            current_combo_total_cents: currentComboTotalCents,
            target_combo_total_cents: targetComboTotalCents,
            difference_cents: differenceCents,
            combo_installments:
              installmentCount > 1 ? installmentCount : undefined,
          }),
        },
        { onConflict: 'asaas_payment_id' }
      )
      .select('id')
      .single();

    if (paidAt && paymentRow) {
      const applied = await applyComboTierUpgradeAfterPayment(
        admin,
        input.subscriptionId,
        {
          id: paymentRow.id,
          amountCents: differenceCents,
          paidAt,
          installments: installmentCount,
        }
      );

      if (!applied) {
        return {
          error:
            'Pagamento recebido, mas o upgrade do combo falhou. Nossa equipe foi notificada.',
        };
      }
    }

    return { success: true };
  } catch (error) {
    await input.supabase
      .from('subscriptions')
      .update({
        pending_plan_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.subscriptionId)
      .eq('user_id', input.userId)
      .eq('status', 'active')
      .eq('pending_plan_id', targetPlan.id);

    return {
      error:
        error instanceof Error
          ? error.message
          : 'Pagamento do upgrade recusado.',
    };
  }
}

export async function upgradeComboPlanTierViaPagarme(input: {
  supabase: SupabaseClient;
  userId: string;
  subscriptionId: string;
  targetPlanSlug: PlanSlug;
  installmentCount: number;
  cardToken: string;
  cardLast4: string;
  cardBrand: string;
  billingAddress: PagarmeBillingAddressInput;
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    cpf: string | null;
    phone: string | null;
    pagarme_customer_id: string | null;
  };
  address: {
    recipient: string;
    zip_code: string;
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
  };
}): Promise<{ success: true } | { error: string }> {
  const resolved = await resolveChargeContext(
    input.supabase,
    input.userId,
    input.subscriptionId,
    input.targetPlanSlug
  );
  if ('error' in resolved) return resolved;

  const {
    subscription,
    currentPlan,
    targetPlan,
    billingTerm,
    differenceCents,
    remainingMonths,
    totalPrepaidMonths,
    currentComboTotalCents,
    targetComboTotalCents,
  } = resolved.context;

  if (
    !subscription.pagarme_subscription_id &&
    !subscription.pagarme_customer_id
  ) {
    return {
      error:
        'Esta assinatura não está no Pagar.me. Use o pagamento Asaas para o upgrade.',
    };
  }

  const installmentCount = Math.min(
    Math.max(1, input.installmentCount),
    COMBO_MAX_INSTALLMENTS
  );

  const admin = createAdminClient();
  const pagarmeCustomerId = await getOrCreatePagarmeCustomer(
    input.supabase,
    input.profile,
    input.address
  );

  const { error: pendingError } = await input.supabase
    .from('subscriptions')
    .update({
      pending_plan_id: targetPlan.id,
      pagarme_customer_id: pagarmeCustomerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.subscriptionId)
    .eq('user_id', input.userId)
    .eq('status', 'active')
    .is('pending_plan_id', null);

  if (pendingError) {
    return { error: 'Não foi possível iniciar o upgrade do combo.' };
  }

  try {
    const order = await chargePagarmeOneTimeOrder({
      customerId: pagarmeCustomerId,
      valueCents: differenceCents,
      description: `DungeonBox — Upgrade combo ${currentPlan.name} → ${targetPlan.name}`,
      billingAddress: input.billingAddress,
      orderCode: buildPagarmeSubscriptionComboTierCode(input.subscriptionId),
      installments: installmentCount,
      cardToken: input.cardToken,
      metadata: {
        subscription_id: input.subscriptionId,
        charge_kind: 'combo_tier_upgrade',
        billing_term: billingTerm,
        from_plan: currentPlan.slug,
        to_plan: targetPlan.slug,
      },
    });

    assertPagarmeCreditCardOrderPaid(order);

    const ids = resolvePagarmeOrderChargeIds(order);
    const paidAt = isPagarmeChargePaid(ids.chargeStatus)
      ? new Date().toISOString()
      : null;

    if (!paidAt || !ids.chargeId) {
      throw new Error('Pagamento do upgrade não foi confirmado.');
    }

    const { data: paymentRow } = await admin
      .from('payments')
      .upsert(
        {
          user_id: input.userId,
          subscription_id: input.subscriptionId,
          pagarme_charge_id: ids.chargeId,
          pagarme_order_id: ids.orderId,
          amount_cents: differenceCents,
          currency: 'BRL',
          status: 'approved',
          paid_at: paidAt,
          installments: installmentCount,
          payment_method: 'credit_card',
          card_last4: input.cardLast4,
          card_brand: input.cardBrand,
          status_detail: JSON.stringify({
            type: 'combo_tier_upgrade',
            billing_term: billingTerm,
            from_plan: currentPlan.slug,
            to_plan: targetPlan.slug,
            remaining_months: remainingMonths,
            total_prepaid_months: totalPrepaidMonths,
            current_combo_total_cents: currentComboTotalCents,
            target_combo_total_cents: targetComboTotalCents,
            difference_cents: differenceCents,
            gateway: 'pagarme',
            combo_installments:
              installmentCount > 1 ? installmentCount : undefined,
          }),
        },
        { onConflict: 'pagarme_charge_id' }
      )
      .select('id')
      .single();

    if (!paymentRow) {
      throw new Error('Não foi possível registrar o pagamento do upgrade.');
    }

    const applied = await applyComboTierUpgradeAfterPayment(
      admin,
      input.subscriptionId,
      {
        id: paymentRow.id,
        amountCents: differenceCents,
        paidAt,
        installments: installmentCount,
      }
    );

    if (!applied) {
      return {
        error:
          'Pagamento recebido, mas o upgrade do combo falhou. Nossa equipe foi notificada.',
      };
    }

    return { success: true };
  } catch (error) {
    await input.supabase
      .from('subscriptions')
      .update({
        pending_plan_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.subscriptionId)
      .eq('user_id', input.userId)
      .eq('status', 'active')
      .eq('pending_plan_id', targetPlan.id);

    return {
      error:
        error instanceof Error
          ? error.message
          : 'Pagamento do upgrade recusado.',
    };
  }
}

export async function handleComboTierUpgradePaymentConfirmed(
  supabase: SupabaseClient,
  payment: AsaasWebhookPayment,
  subscriptionId: string
): Promise<'processed' | 'skipped'> {
  const { data: local } = await supabase
    .from('subscriptions')
    .select(
      'id, status, pending_plan_id, user_id, billing_term, combo_installments'
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (
    !local ||
    local.status !== 'active' ||
    !local.pending_plan_id ||
    !isComboTerm((local.billing_term as BillingTerm | null) ?? 'monthly')
  ) {
    return 'skipped';
  }

  const amountCents = Math.round((payment.value ?? 0) * 100);
  if (amountCents <= 0) return 'skipped';

  const installments = local.combo_installments ?? 1;
  const now = new Date().toISOString();

  const { data: paymentRow } = await supabase
    .from('payments')
    .upsert(
      {
        user_id: local.user_id,
        subscription_id: local.id,
        asaas_payment_id: payment.id,
        amount_cents: amountCents,
        currency: 'BRL',
        status: 'approved',
        paid_at: now,
        installments,
        status_detail: JSON.stringify({
          type: 'combo_tier_upgrade',
          billing_term: local.billing_term,
          difference_cents: amountCents,
        }),
      },
      { onConflict: 'asaas_payment_id' }
    )
    .select('id, amount_cents')
    .single();

  if (!paymentRow) return 'skipped';

  const applied = await applyComboTierUpgradeAfterPayment(
    supabase,
    subscriptionId,
    {
      id: paymentRow.id,
      amountCents: paymentRow.amount_cents ?? amountCents,
      paidAt: now,
      installments,
    }
  );

  return applied ? 'processed' : 'skipped';
}

export async function handlePagarmeComboTierUpgradePaymentConfirmed(
  supabase: SupabaseClient,
  input: {
    chargeId?: string | null;
    orderId?: string | null;
    amountCents?: number | null;
  },
  subscriptionId: string
): Promise<'processed' | 'skipped'> {
  const { data: local } = await supabase
    .from('subscriptions')
    .select(
      'id, status, pending_plan_id, user_id, billing_term, combo_installments'
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (
    !local ||
    local.status !== 'active' ||
    !local.pending_plan_id ||
    !isComboTerm((local.billing_term as BillingTerm | null) ?? 'monthly')
  ) {
    return 'skipped';
  }

  const amountCents = Math.max(0, input.amountCents ?? 0);
  if (amountCents <= 0) return 'skipped';

  const installments = local.combo_installments ?? 1;
  const now = new Date().toISOString();

  const paymentPayload = {
    user_id: local.user_id,
    subscription_id: local.id,
    amount_cents: amountCents,
    currency: 'BRL',
    status: 'approved' as const,
    paid_at: now,
    installments,
    payment_method: 'credit_card',
    status_detail: JSON.stringify({
      type: 'combo_tier_upgrade',
      billing_term: local.billing_term,
      difference_cents: amountCents,
      gateway: 'pagarme',
    }),
    ...(input.chargeId ? { pagarme_charge_id: input.chargeId } : {}),
    ...(input.orderId ? { pagarme_order_id: input.orderId } : {}),
  };

  let paymentRow: { id: string; amount_cents: number } | null = null;

  if (input.chargeId) {
    const { data } = await supabase
      .from('payments')
      .upsert(paymentPayload, { onConflict: 'pagarme_charge_id' })
      .select('id, amount_cents')
      .single();
    paymentRow = data;
  } else {
    const { data } = await supabase
      .from('payments')
      .insert(paymentPayload)
      .select('id, amount_cents')
      .single();
    paymentRow = data;
  }

  if (!paymentRow) return 'skipped';

  const applied = await applyComboTierUpgradeAfterPayment(
    supabase,
    subscriptionId,
    {
      id: paymentRow.id,
      amountCents: paymentRow.amount_cents ?? amountCents,
      paidAt: now,
      installments,
    }
  );

  return applied ? 'processed' : 'skipped';
}
