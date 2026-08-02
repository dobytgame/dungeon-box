import type { SupabaseClient } from '@supabase/supabase-js';
import { asaasRequest } from '@/lib/asaas/client';
import { chargeAsaasOneTimePayment } from '@/lib/asaas/one-time-payment';
import { isAsaasPaymentConfirmed } from '@/lib/asaas/payment-status';
import { cancelAsaasSubscriptionBestEffort } from '@/lib/asaas/subscription-api';
import type {
  AsaasCreditCardHolderInput,
  AsaasCreditCardInput,
} from '@/lib/asaas/subscription-checkout';
import { getOrCreateAsaasCustomer } from '@/lib/asaas/customer';
import {
  calculateComboSavingsCents,
  calculateComboTotalCents,
  COMBO_BILLING_ENABLED,
  COMBO_MAX_INSTALLMENTS,
  COMBO_OPTIONS,
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
import { logSubscriptionPlanChange } from '@/lib/subscriptions/plan-change-log';
import {
  resolvePromoCode,
} from '@/lib/checkout/promo-codes';
import {
  resolveSubscriptionRecurringCharge,
  type SubscriptionRecurringContext,
} from '@/lib/subscriptions/recurring-charge';
import { seedPrepaidComboProductionSchedule } from '@/lib/subscriptions/combo-production-schedule';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AsaasWebhookPayment } from '@/lib/asaas/webhook-handlers';
import { getOrCreatePagarmeCustomer } from '@/lib/pagarme/customer';
import { resolveLatestPagarmeCustomerCardId } from '@/lib/pagarme/cards';
import {
  assertPagarmeCreditCardOrderPaid,
  chargePagarmeOneTimeOrder,
  isPagarmeChargePaid,
  resolvePagarmeOrderCardId,
  resolvePagarmeOrderChargeIds,
} from '@/lib/pagarme/one-time-order';
import type { PagarmeBillingAddressInput } from '@/lib/pagarme/subscription-checkout';
import { buildPagarmeSubscriptionComboCode } from '@/lib/pagarme/store-order-code';
import { pagarmeRequest } from '@/lib/pagarme/client';
import { cancelPagarmeSubscriptionBestEffort } from '@/lib/pagarme/subscription-api';

type PlanRow = {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
};

type SubscriptionComboUpgradeRow = SubscriptionRecurringContext & {
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
  current_cycle?: number | null;
  loyalty_level?: number | null;
  started_at?: string | null;
  plans?: PlanRow | PlanRow[] | null;
};

export type ComboUpgradeOptionPricing = {
  term: Exclude<BillingTerm, 'monthly'>;
  label: string;
  badge: string;
  description: string;
  totalCents: number;
  originalTotalCents: number;
  savingsCents: number;
  installmentLabel: string;
  interestFreeMax: number;
};

export type ComboUpgradePricingPreview = {
  promoCode: string | null;
  promoSummary: string | null;
  options: ComboUpgradeOptionPricing[];
};

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function formatAsaasDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function centsToReais(cents: number): number {
  return Math.round(cents) / 100;
}

async function recordComboUpgradePromoRedemption(
  supabase: SupabaseClient,
  promoCodeId: string,
  userId: string,
  subscriptionId: string
): Promise<void> {
  const { error: redemptionError } = await supabase
    .from('promo_code_redemptions')
    .insert({
      promo_code_id: promoCodeId,
      user_id: userId,
      subscription_id: subscriptionId,
    });

  if (redemptionError) {
    console.error('[combo-upgrade] promo redemption:', redemptionError);
    return;
  }

  const { data: promo } = await supabase
    .from('promo_codes')
    .select('times_redeemed')
    .eq('id', promoCodeId)
    .single();

  if (!promo) return;

  await supabase
    .from('promo_codes')
    .update({
      times_redeemed: (promo.times_redeemed ?? 0) + 1,
    })
    .eq('id', promoCodeId);
}

function isMonthlyActiveSubscription(subscription: SubscriptionComboUpgradeRow): boolean {
  const term = (subscription.billing_term ?? 'monthly') as BillingTerm;
  return subscription.status === 'active' && term === 'monthly';
}

function buildCheckoutDataFromSubscription(
  subscription: SubscriptionComboUpgradeRow,
  plan: PlanRow,
  billingTerm: Exclude<BillingTerm, 'monthly'>,
  installmentCount: number,
  discountedPlanCents: number,
  shippingCents: number
): CheckoutData {
  const planSlug = plan.slug as PlanSlug;

  return {
    planSlugs: [planSlug],
    billingTerm,
    installmentCount,
    paintKitBump: parsePaintKitBump(subscription.special_notes),
    paintKitBumpRecurring: parsePaintKitBumpRecurring(subscription.special_notes),
    addressId: subscription.address_id ?? '',
    specialNotes: '',
    discountedPlanCentsByPlan: { [planSlug]: discountedPlanCents },
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

async function resolveComboUpgradeChargeContext(
  admin: SupabaseClient,
  subscription: SubscriptionComboUpgradeRow,
  plan: PlanRow,
  userId: string,
  couponCode?: string | null
): Promise<{
  planCents: number;
  shippingCents: number;
  promoCode: string | null;
  promoSummary: string | null;
  newPromoId: string | null;
}> {
  const trimmedCoupon = couponCode?.trim() ?? '';

  if (trimmedCoupon) {
    const resolved = await resolvePromoCode(
      admin,
      trimmedCoupon,
      plan.slug as PlanSlug,
      userId,
      plan.price_cents
    );

    return {
      planCents: resolved.discountedPriceCents,
      shippingCents: resolved.freeShipping
        ? 0
        : (subscription.shipping_cents ?? 0),
      promoCode: resolved.promo.code,
      promoSummary: resolved.summary,
      newPromoId: resolved.promo.id,
    };
  }

  return {
    planCents: plan.price_cents,
    shippingCents: subscription.shipping_cents ?? 0,
    promoCode: null,
    promoSummary: null,
    newPromoId: null,
  };
}

function buildComboUpgradeOptionPricing(
  subscription: SubscriptionComboUpgradeRow,
  plan: PlanRow,
  billingTerm: Exclude<BillingTerm, 'monthly'>,
  charge: { planCents: number; shippingCents: number }
): ComboUpgradeOptionPricing {
  const planSlug = plan.slug as PlanSlug;
  const checkoutData = buildCheckoutDataFromSubscription(
    subscription,
    plan,
    billingTerm,
    1,
    charge.planCents,
    charge.shippingCents
  );
  const totalCents = calculateComboTotalCents(checkoutData, billingTerm);

  const baselineCheckout = buildCheckoutDataFromSubscription(
    subscription,
    plan,
    billingTerm,
    1,
    plan.price_cents,
    subscription.shipping_cents ?? 0
  );
  const originalTotalCents = calculateComboTotalCents(
    baselineCheckout,
    billingTerm
  );
  const savingsCents = calculateComboSavingsCents(baselineCheckout, billingTerm);
  const option = COMBO_OPTIONS.find((entry) => entry.term === billingTerm)!;
  const interestFreeMax = comboInterestFreeMax(planSlug, billingTerm);

  return {
    term: billingTerm,
    label: option.label,
    badge: option.badge,
    description: option.description,
    totalCents,
    originalTotalCents,
    savingsCents,
    installmentLabel: comboInstallmentLabel(1, interestFreeMax),
    interestFreeMax,
  };
}

export async function previewComboUpgradePricing(
  subscription: SubscriptionComboUpgradeRow,
  userId: string,
  couponCode?: string | null
): Promise<ComboUpgradePricingPreview | null> {
  if (!COMBO_BILLING_ENABLED || !isMonthlyActiveSubscription(subscription)) {
    return null;
  }

  if (subscription.pending_plan_id || subscription.pending_billing_term) {
    return null;
  }

  const plan = relOne(subscription.plans);
  if (!plan?.slug) return null;

  const admin = createAdminClient();
  const charge = await resolveComboUpgradeChargeContext(
    admin,
    subscription,
    plan,
    userId,
    couponCode
  );

  const options = COMBO_OPTIONS.map((option) =>
    buildComboUpgradeOptionPricing(
      subscription,
      plan,
      option.term,
      charge
    )
  );

  return {
    promoCode: charge.promoCode,
    promoSummary: charge.promoSummary,
    options,
  };
}

export async function buildComboUpgradeOptions(
  subscription: SubscriptionComboUpgradeRow,
  couponCode?: string | null
): Promise<ComboUpgradeOptionPricing[]> {
  const preview = await previewComboUpgradePricing(
    subscription,
    subscription.user_id,
    couponCode
  );
  return preview?.options ?? [];
}

export function canUpgradeSubscriptionToCombo(
  subscription: SubscriptionComboUpgradeRow
): boolean {
  return (
    COMBO_BILLING_ENABLED &&
    isMonthlyActiveSubscription(subscription) &&
    !subscription.pending_plan_id &&
    !subscription.pending_billing_term &&
    Boolean(
      subscription.asaas_subscription_id || subscription.pagarme_subscription_id
    )
  );
}

type AsaasSubscriptionResponse = {
  id: string;
};

type PagarmeSubscriptionResponse = {
  id: string;
  next_billing_at?: string;
};

type PagarmeComboUpgradeCardContext = {
  customerId: string;
  billingAddress: PagarmeBillingAddressInput;
  cardToken?: string;
  cardId?: string | null;
};

function formatPagarmeDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildPagarmeSubscriptionCard(
  card: PagarmeComboUpgradeCardContext
): Record<string, unknown> {
  const billingAddress = {
    ...card.billingAddress,
    country: card.billingAddress.country ?? 'BR',
  };

  if (card.cardId) {
    return { card_id: card.cardId };
  }

  if (!card.cardToken) {
    throw new Error('Cartão Pagar.me ausente para renovação do combo.');
  }

  return {
    card_token: card.cardToken,
    card: {
      billing_address: billingAddress,
    },
  };
}

export async function applyComboUpgradeAfterPayment(
  supabase: SupabaseClient,
  subscriptionId: string,
  payment: {
    id: string;
    amountCents: number;
    paidAt: string;
    installments: number;
  },
  asaasCard?: {
    creditCard: AsaasCreditCardInput;
    creditCardHolderInfo: AsaasCreditCardHolderInput;
    remoteIp: string;
  },
  pagarmeCard?: PagarmeComboUpgradeCardContext
): Promise<boolean> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(
      'id, user_id, plan_id, status, billing_term, pending_billing_term, combo_total_cents, combo_installments, current_cycle, loyalty_level, started_at, asaas_subscription_id, asaas_customer_id, pagarme_subscription_id, pagarme_customer_id, promo_code, shipping_cents, special_notes, plans!plan_id(id, slug, name, price_cents)'
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription) return false;

  const pendingTerm = subscription.pending_billing_term as BillingTerm | null;
  if (
    subscription.status !== 'active' ||
    !pendingTerm ||
    !isComboTerm(pendingTerm)
  ) {
    return false;
  }

  const plan = relOne(
    subscription.plans as PlanRow | PlanRow[] | null
  );
  if (!plan) return false;

  const admin = createAdminClient();
  const charge = await resolveSubscriptionRecurringCharge(
    admin,
    plan,
    subscription
  );

  const isPagarme =
    Boolean(subscription.pagarme_subscription_id) || Boolean(pagarmeCard);
  const isAsaas =
    Boolean(subscription.asaas_subscription_id) || Boolean(asaasCard);

  if (subscription.asaas_subscription_id) {
    await cancelAsaasSubscriptionBestEffort(subscription.asaas_subscription_id);
  }
  if (subscription.pagarme_subscription_id) {
    await cancelPagarmeSubscriptionBestEffort(
      subscription.pagarme_subscription_id
    );
  }

  const now = new Date();
  const prepaidMonths = prepaidMonthsForTerm(pendingTerm) ?? 0;
  const prepaidUntil = addMonths(now, prepaidMonths);
  const currentCycle = subscription.current_cycle ?? 1;
  const nextCycleStart = currentCycle + 1;

  let newAsaasSubscriptionId: string | null = null;
  let newPagarmeSubscriptionId: string | null = null;
  let nextBillingDate = prepaidUntil.toISOString();

  if (isAsaas && subscription.asaas_customer_id && asaasCard) {
    try {
      const asaasSubscription = await asaasRequest<AsaasSubscriptionResponse>(
        '/subscriptions/',
        {
          method: 'POST',
          body: {
            customer: subscription.asaas_customer_id,
            billingType: 'CREDIT_CARD',
            cycle: 'MONTHLY',
            value: centsToReais(charge.totalCents),
            nextDueDate: formatAsaasDate(prepaidUntil),
            description: `DungeonBox — ${charge.description} (renovação mensal)`,
            externalReference: subscriptionId,
            creditCard: asaasCard.creditCard,
            creditCardHolderInfo: asaasCard.creditCardHolderInfo,
            remoteIp: asaasCard.remoteIp,
          },
        }
      );
      newAsaasSubscriptionId = asaasSubscription.id;
    } catch (error) {
      console.error('[combo-upgrade] deferred asaas subscription failed:', error);
    }
  }

  if (isPagarme && pagarmeCard) {
    try {
      const pagarmeSubscription = await pagarmeRequest<PagarmeSubscriptionResponse>(
        '/subscriptions',
        {
          method: 'POST',
          body: {
            code: subscriptionId,
            payment_method: 'credit_card',
            currency: 'BRL',
            interval: 'month',
            interval_count: 1,
            billing_type: 'prepaid',
            start_at: formatPagarmeDate(prepaidUntil),
            customer_id: pagarmeCard.customerId,
            ...buildPagarmeSubscriptionCard(pagarmeCard),
            items: [
              {
                description: `DungeonBox — ${charge.description} (renovação mensal)`,
                quantity: 1,
                pricing_scheme: {
                  scheme_type: 'unit',
                  price: charge.totalCents,
                },
              },
            ],
            metadata: {
              subscription_id: subscriptionId,
              billing_term: pendingTerm,
              charge_kind: 'combo_upgrade_renewal',
            },
          },
        }
      );
      newPagarmeSubscriptionId = pagarmeSubscription.id;
      nextBillingDate =
        pagarmeSubscription.next_billing_at ?? prepaidUntil.toISOString();
    } catch (error) {
      console.error('[combo-upgrade] deferred pagarme subscription failed:', error);
    }
  }

  const comboTotalCents =
    subscription.combo_total_cents != null && subscription.combo_total_cents > 0
      ? subscription.combo_total_cents
      : payment.amountCents;

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      billing_term: pendingTerm,
      pending_billing_term: null,
      prepaid_months: prepaidMonths,
      prepaid_until: prepaidUntil.toISOString(),
      combo_total_cents: comboTotalCents,
      combo_installments: subscription.combo_installments ?? payment.installments,
      ...(isAsaas
        ? { asaas_subscription_id: newAsaasSubscriptionId }
        : {}),
      ...(isPagarme
        ? {
            pagarme_subscription_id: newPagarmeSubscriptionId,
            pagarme_customer_id:
              pagarmeCard?.customerId ??
              subscription.pagarme_customer_id ??
              null,
          }
        : {}),
      current_period_start: now.toISOString(),
      current_period_end: prepaidUntil.toISOString(),
      next_billing_date: nextBillingDate,
      updated_at: now.toISOString(),
    })
    .eq('id', subscriptionId)
    .eq('status', 'active');

  if (updateError) {
    console.error('[combo-upgrade] apply update failed:', updateError);
    return false;
  }

  await seedPrepaidComboProductionSchedule(supabase, {
    subscriptionId,
    billingTerm: pendingTerm,
    paymentLink: {
      id: payment.id,
      amount_cents: payment.amountCents,
      paid_at: payment.paidAt,
    },
    anchorDate: new Date(payment.paidAt),
    startCycleNumber: nextCycleStart,
  });

  if (subscription.user_id && subscription.plan_id) {
    await logSubscriptionPlanChange(supabase, {
      subscriptionId,
      userId: subscription.user_id,
      fromPlanId: subscription.plan_id,
      toPlanId: subscription.plan_id,
      event: 'applied',
      actor: 'user',
      metadata: {
        type: 'combo_upgrade',
        fromBillingTerm: 'monthly',
        toBillingTerm: pendingTerm,
        preservedCycle: currentCycle,
        preservedLoyaltyLevel: subscription.loyalty_level,
        comboTotalCents,
        gateway: isPagarme ? 'pagarme' : 'asaas',
      },
    });
  }

  return true;
}

export async function upgradeMonthlySubscriptionToCombo(input: {
  supabase: SupabaseClient;
  userId: string;
  subscriptionId: string;
  billingTerm: Exclude<BillingTerm, 'monthly'>;
  installmentCount: number;
  couponCode?: string | null;
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
  if (!COMBO_BILLING_ENABLED || !isComboTerm(input.billingTerm)) {
    return { error: 'Combos indisponíveis no momento.' };
  }

  const installmentCount = Math.min(
    Math.max(1, input.installmentCount),
    COMBO_MAX_INSTALLMENTS
  );

  const { data: subscription } = await input.supabase
    .from('subscriptions')
    .select(
      'id, user_id, status, plan_id, address_id, asaas_subscription_id, asaas_customer_id, pagarme_subscription_id, pagarme_customer_id, pending_plan_id, pending_billing_term, billing_term, promo_code, shipping_cents, shipping_region, special_notes, plans!plan_id(id, slug, name, price_cents)'
    )
    .eq('id', input.subscriptionId)
    .eq('user_id', input.userId)
    .maybeSingle();

  if (!subscription) {
    return { error: 'Assinatura não encontrada.' };
  }

  if (!subscription.asaas_subscription_id) {
    return {
      error:
        'Esta assinatura não está no Asaas. Use o pagamento Pagar.me para migrar.',
    };
  }

  if (!canUpgradeSubscriptionToCombo(subscription)) {
    return {
      error:
        'Só é possível migrar assinaturas mensais ativas sem upgrade de plano pendente.',
    };
  }

  const plan = relOne(subscription.plans as PlanRow | PlanRow[] | null);
  if (!plan?.slug) {
    return { error: 'Plano atual não encontrado.' };
  }

  const admin = createAdminClient();
  let charge: Awaited<ReturnType<typeof resolveComboUpgradeChargeContext>>;
  try {
    charge = await resolveComboUpgradeChargeContext(
      admin,
      subscription,
      plan,
      input.userId,
      input.couponCode
    );
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Cupom inválido.',
    };
  }

  const checkoutData = buildCheckoutDataFromSubscription(
    subscription,
    plan,
    input.billingTerm,
    installmentCount,
    charge.planCents,
    charge.shippingCents
  );

  const comboTotalCents = calculateComboTotalCents(checkoutData, input.billingTerm);
  if (comboTotalCents <= 0) {
    return { error: 'Valor do combo inválido.' };
  }

  const asaasCustomerId = await getOrCreateAsaasCustomer(
    input.supabase,
    input.profile,
    input.address
  );

  const { error: pendingError } = await input.supabase
    .from('subscriptions')
    .update({
      pending_billing_term: input.billingTerm,
      combo_total_cents: comboTotalCents,
      combo_installments: installmentCount,
      asaas_customer_id: asaasCustomerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.subscriptionId)
    .eq('user_id', input.userId)
    .eq('status', 'active');

  if (pendingError) {
    return { error: 'Não foi possível iniciar a migração para combo.' };
  }

  const comboLabel =
    input.billingTerm === 'combo_3'
      ? '3 meses'
      : input.billingTerm === 'combo_6'
        ? '6 meses'
        : '12 meses';

  try {
    const comboPayment = await chargeAsaasOneTimePayment({
      customerId: asaasCustomerId,
      valueCents: comboTotalCents,
      description: `DungeonBox — Combo ${comboLabel} (${plan.name})`,
      remoteIp: input.remoteIp,
      creditCard: input.creditCard,
      creditCardHolderInfo: input.creditCardHolderInfo,
      externalReference: `${input.subscriptionId}:combo`,
      installmentCount,
      interestFreeMax: comboInterestFreeMax(
        plan.slug as PlanSlug,
        input.billingTerm
      ),
    });

    const paidAt = isAsaasPaymentConfirmed(comboPayment.status)
      ? new Date().toISOString()
      : null;

    const { data: paymentRow } = await admin
      .from('payments')
      .upsert(
        {
          user_id: input.userId,
          subscription_id: input.subscriptionId,
          asaas_payment_id: comboPayment.id,
          amount_cents: comboTotalCents,
          currency: 'BRL',
          status: paidAt ? 'approved' : 'pending',
          paid_at: paidAt,
          installments: installmentCount,
          payment_method: 'credit_card',
          status_detail: JSON.stringify({
            type: 'combo_upgrade',
            billing_term: input.billingTerm,
            combo_total_cents: comboTotalCents,
            combo_installments:
              installmentCount > 1 ? installmentCount : undefined,
            promo_code: charge.promoCode ?? undefined,
            promo_summary: charge.promoSummary ?? undefined,
          }),
        },
        { onConflict: 'asaas_payment_id' }
      )
      .select('id')
      .single();

    if (paidAt && paymentRow) {
      const applied = await applyComboUpgradeAfterPayment(
        admin,
        input.subscriptionId,
        {
          id: paymentRow.id,
          amountCents: comboTotalCents,
          paidAt,
          installments: installmentCount,
        },
        {
          creditCard: input.creditCard,
          creditCardHolderInfo: input.creditCardHolderInfo,
          remoteIp: input.remoteIp,
        }
      );

      if (!applied) {
        return {
          error:
            'Pagamento recebido, mas a migração para combo falhou. Nossa equipe foi notificada.',
        };
      }

      if (charge.newPromoId && charge.promoCode) {
        await recordComboUpgradePromoRedemption(
          admin,
          charge.newPromoId,
          input.userId,
          input.subscriptionId
        );
      }
    }

    return { success: true };
  } catch (error) {
    await input.supabase
      .from('subscriptions')
      .update({
        pending_billing_term: null,
        combo_total_cents: null,
        combo_installments: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.subscriptionId)
      .eq('user_id', input.userId)
      .eq('status', 'active');

    const message =
      error instanceof Error ? error.message : 'Pagamento do combo recusado.';
    return { error: message };
  }
}

export async function handleComboUpgradePaymentConfirmed(
  supabase: SupabaseClient,
  payment: AsaasWebhookPayment,
  subscriptionId: string
): Promise<'processed' | 'skipped'> {
  const { data: local } = await supabase
    .from('subscriptions')
    .select(
      'id, status, pending_billing_term, combo_total_cents, combo_installments, user_id'
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (
    !local ||
    local.status !== 'active' ||
    !local.pending_billing_term ||
    !isComboTerm(local.pending_billing_term as BillingTerm)
  ) {
    return 'skipped';
  }

  const asaasAmountCents = Math.round((payment.value ?? 0) * 100);
  const amountCents =
    local.combo_total_cents != null && local.combo_total_cents > 0
      ? local.combo_total_cents
      : asaasAmountCents;
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
          type: 'combo_upgrade',
          billing_term: local.pending_billing_term,
          combo_total_cents: amountCents,
          combo_installments: installments > 1 ? installments : undefined,
        }),
      },
      { onConflict: 'asaas_payment_id' }
    )
    .select('id, amount_cents')
    .single();

  if (!paymentRow) {
    return 'skipped';
  }

  const applied = await applyComboUpgradeAfterPayment(supabase, subscriptionId, {
    id: paymentRow.id,
    amountCents: paymentRow.amount_cents ?? amountCents,
    paidAt: now,
    installments,
  });

  return applied ? 'processed' : 'skipped';
}

export async function upgradeMonthlySubscriptionToComboViaPagarme(input: {
  supabase: SupabaseClient;
  userId: string;
  subscriptionId: string;
  billingTerm: Exclude<BillingTerm, 'monthly'>;
  installmentCount: number;
  couponCode?: string | null;
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
  if (!COMBO_BILLING_ENABLED || !isComboTerm(input.billingTerm)) {
    return { error: 'Combos indisponíveis no momento.' };
  }

  const installmentCount = Math.min(
    Math.max(1, input.installmentCount),
    COMBO_MAX_INSTALLMENTS
  );

  const { data: subscription } = await input.supabase
    .from('subscriptions')
    .select(
      'id, user_id, status, plan_id, address_id, asaas_subscription_id, asaas_customer_id, pagarme_subscription_id, pagarme_customer_id, pending_plan_id, pending_billing_term, billing_term, promo_code, shipping_cents, shipping_region, special_notes, plans!plan_id(id, slug, name, price_cents)'
    )
    .eq('id', input.subscriptionId)
    .eq('user_id', input.userId)
    .maybeSingle();

  if (!subscription) {
    return { error: 'Assinatura não encontrada.' };
  }

  if (!subscription.pagarme_subscription_id) {
    return {
      error:
        'Esta assinatura não está no Pagar.me. Use o pagamento Asaas para migrar.',
    };
  }

  if (!canUpgradeSubscriptionToCombo(subscription)) {
    return {
      error:
        'Só é possível migrar assinaturas mensais ativas sem upgrade de plano pendente.',
    };
  }

  const plan = relOne(subscription.plans as PlanRow | PlanRow[] | null);
  if (!plan?.slug) {
    return { error: 'Plano atual não encontrado.' };
  }

  const admin = createAdminClient();
  let charge: Awaited<ReturnType<typeof resolveComboUpgradeChargeContext>>;
  try {
    charge = await resolveComboUpgradeChargeContext(
      admin,
      subscription,
      plan,
      input.userId,
      input.couponCode
    );
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Cupom inválido.',
    };
  }

  const checkoutData = buildCheckoutDataFromSubscription(
    subscription,
    plan,
    input.billingTerm,
    installmentCount,
    charge.planCents,
    charge.shippingCents
  );

  const comboTotalCents = calculateComboTotalCents(
    checkoutData,
    input.billingTerm
  );
  if (comboTotalCents <= 0) {
    return { error: 'Valor do combo inválido.' };
  }

  const pagarmeCustomerId = await getOrCreatePagarmeCustomer(
    input.supabase,
    input.profile,
    input.address
  );

  const { error: pendingError } = await input.supabase
    .from('subscriptions')
    .update({
      pending_billing_term: input.billingTerm,
      combo_total_cents: comboTotalCents,
      combo_installments: installmentCount,
      pagarme_customer_id: pagarmeCustomerId,
      card_last4: input.cardLast4,
      card_brand: input.cardBrand,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.subscriptionId)
    .eq('user_id', input.userId)
    .eq('status', 'active');

  if (pendingError) {
    return { error: 'Não foi possível iniciar a migração para combo.' };
  }

  const comboLabel =
    input.billingTerm === 'combo_3'
      ? '3 meses'
      : input.billingTerm === 'combo_6'
        ? '6 meses'
        : '12 meses';

  try {
    // Cobrança inicial com token (leva CVV). card_id sem CVV é recusado na 1ª compra.
    const comboOrder = await chargePagarmeOneTimeOrder({
      customerId: pagarmeCustomerId,
      valueCents: comboTotalCents,
      description: `DungeonBox — Combo ${comboLabel} (${plan.name})`,
      cardToken: input.cardToken,
      billingAddress: input.billingAddress,
      orderCode: buildPagarmeSubscriptionComboCode(input.subscriptionId),
      installments: installmentCount,
      metadata: {
        subscription_id: input.subscriptionId,
        charge_kind: 'combo_upgrade',
        billing_term: input.billingTerm,
        plan_slug: plan.slug,
        interest_free_max: String(
          comboInterestFreeMax(plan.slug as PlanSlug, input.billingTerm)
        ),
      },
    });

    assertPagarmeCreditCardOrderPaid(
      comboOrder,
      'Pagamento do combo recusado. Verifique os dados do cartão e tente novamente.'
    );

    const chargeIds = resolvePagarmeOrderChargeIds(comboOrder);
    const comboPaid = isPagarmeChargePaid(chargeIds.chargeStatus);
    const paidAt = comboPaid ? new Date().toISOString() : null;

    let savedCardId =
      (await resolvePagarmeOrderCardId(comboOrder)) ||
      (await resolveLatestPagarmeCustomerCardId(pagarmeCustomerId));

    if (!savedCardId) {
      return {
        error:
          'Pagamento aprovado, mas não foi possível vincular o cartão à renovação. Contate o suporte.',
      };
    }

    const paymentPayload = {
      user_id: input.userId,
      subscription_id: input.subscriptionId,
      pagarme_order_id: comboOrder.id,
      amount_cents: comboTotalCents,
      currency: 'BRL',
      status: paidAt ? ('approved' as const) : ('pending' as const),
      paid_at: paidAt,
      installments: installmentCount,
      payment_method: 'credit_card',
      status_detail: JSON.stringify({
        type: 'combo_upgrade',
        billing_term: input.billingTerm,
        combo_total_cents: comboTotalCents,
        combo_installments:
          installmentCount > 1 ? installmentCount : undefined,
        promo_code: charge.promoCode ?? undefined,
        promo_summary: charge.promoSummary ?? undefined,
        gateway: 'pagarme',
      }),
    };

    let paymentRow: { id: string } | null = null;

    if (chargeIds.chargeId) {
      const { data } = await admin
        .from('payments')
        .upsert(
          {
            ...paymentPayload,
            pagarme_charge_id: chargeIds.chargeId,
          },
          { onConflict: 'pagarme_charge_id' }
        )
        .select('id')
        .single();
      paymentRow = data;
    } else {
      const { data } = await admin
        .from('payments')
        .insert(paymentPayload)
        .select('id')
        .single();
      paymentRow = data;
    }

    if (paidAt && paymentRow) {
      const applied = await applyComboUpgradeAfterPayment(
        admin,
        input.subscriptionId,
        {
          id: paymentRow.id,
          amountCents: comboTotalCents,
          paidAt,
          installments: installmentCount,
        },
        undefined,
        {
          customerId: pagarmeCustomerId,
          billingAddress: input.billingAddress,
          cardId: savedCardId,
        }
      );

      if (!applied) {
        return {
          error:
            'Pagamento recebido, mas a migração para combo falhou. Nossa equipe foi notificada.',
        };
      }

      if (charge.newPromoId && charge.promoCode) {
        await recordComboUpgradePromoRedemption(
          admin,
          charge.newPromoId,
          input.userId,
          input.subscriptionId
        );
      }
    }

    return { success: true };
  } catch (error) {
    await input.supabase
      .from('subscriptions')
      .update({
        pending_billing_term: null,
        combo_total_cents: null,
        combo_installments: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.subscriptionId)
      .eq('user_id', input.userId)
      .eq('status', 'active');

    const message =
      error instanceof Error ? error.message : 'Pagamento do combo recusado.';
    return { error: message };
  }
}

export async function handlePagarmeComboUpgradePaymentConfirmed(
  supabase: SupabaseClient,
  input: {
    chargeId?: string | null;
    orderId?: string | null;
    amountCents?: number | null;
    cardId?: string | null;
    cardToken?: string;
    billingAddress?: PagarmeBillingAddressInput | null;
    customerId?: string | null;
  },
  subscriptionId: string
): Promise<'processed' | 'skipped'> {
  const { data: local } = await supabase
    .from('subscriptions')
    .select(
      'id, status, pending_billing_term, combo_total_cents, combo_installments, user_id, pagarme_customer_id'
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (
    !local ||
    local.status !== 'active' ||
    !local.pending_billing_term ||
    !isComboTerm(local.pending_billing_term as BillingTerm)
  ) {
    return 'skipped';
  }

  const amountCents =
    local.combo_total_cents != null && local.combo_total_cents > 0
      ? local.combo_total_cents
      : Math.max(0, input.amountCents ?? 0);
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
      type: 'combo_upgrade',
      billing_term: local.pending_billing_term,
      combo_total_cents: amountCents,
      combo_installments: installments > 1 ? installments : undefined,
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

  const customerId =
    input.customerId ?? (local.pagarme_customer_id as string | null);
  const pagarmeCard =
    customerId && input.billingAddress
      ? {
          customerId,
          billingAddress: input.billingAddress,
          cardToken: input.cardToken,
          cardId: input.cardId,
        }
      : undefined;

  const applied = await applyComboUpgradeAfterPayment(
    supabase,
    subscriptionId,
    {
      id: paymentRow.id,
      amountCents: paymentRow.amount_cents ?? amountCents,
      paidAt: now,
      installments,
    },
    undefined,
    pagarmeCard
  );

  return applied ? 'processed' : 'skipped';
}
