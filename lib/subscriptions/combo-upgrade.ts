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
  resolveSubscriptionRecurringCharge,
  type SubscriptionRecurringContext,
} from '@/lib/subscriptions/recurring-charge';
import { seedPrepaidComboProductionSchedule } from '@/lib/subscriptions/combo-production-schedule';
import { createAdminClient } from '@/lib/supabase/admin';
import type { AsaasWebhookPayment } from '@/lib/asaas/webhook-handlers';

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
  savingsCents: number;
  installmentLabel: string;
  interestFreeMax: number;
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

function isMonthlyActiveSubscription(subscription: SubscriptionComboUpgradeRow): boolean {
  const term = (subscription.billing_term ?? 'monthly') as BillingTerm;
  return subscription.status === 'active' && term === 'monthly';
}

function buildCheckoutDataFromSubscription(
  subscription: SubscriptionComboUpgradeRow,
  plan: PlanRow,
  billingTerm: Exclude<BillingTerm, 'monthly'>,
  installmentCount: number,
  discountedPlanCents: number
): CheckoutData {
  const planSlug = plan.slug as PlanSlug;
  const shippingCents = subscription.shipping_cents ?? 0;

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

export async function buildComboUpgradeOptions(
  subscription: SubscriptionComboUpgradeRow
): Promise<ComboUpgradeOptionPricing[]> {
  if (!COMBO_BILLING_ENABLED || !isMonthlyActiveSubscription(subscription)) {
    return [];
  }

  if (subscription.pending_plan_id || subscription.pending_billing_term) {
    return [];
  }

  const plan = relOne(subscription.plans);
  if (!plan?.slug) return [];

  const admin = createAdminClient();
  const charge = await resolveSubscriptionRecurringCharge(admin, plan, subscription);
  const planSlug = plan.slug as PlanSlug;

  return COMBO_OPTIONS.map((option) => {
    const checkoutData = buildCheckoutDataFromSubscription(
      subscription,
      plan,
      option.term,
      1,
      charge.planCents
    );
    const totalCents = calculateComboTotalCents(checkoutData, option.term);
    const savingsCents = calculateComboSavingsCents(checkoutData, option.term);
    const interestFreeMax = comboInterestFreeMax(planSlug, option.term);

    return {
      term: option.term,
      label: option.label,
      badge: option.badge,
      description: option.description,
      totalCents,
      savingsCents,
      installmentLabel: comboInstallmentLabel(1, interestFreeMax),
      interestFreeMax,
    };
  });
}

export function canUpgradeSubscriptionToCombo(
  subscription: SubscriptionComboUpgradeRow
): boolean {
  return (
    COMBO_BILLING_ENABLED &&
    isMonthlyActiveSubscription(subscription) &&
    !subscription.pending_plan_id &&
    !subscription.pending_billing_term &&
    Boolean(subscription.asaas_subscription_id)
  );
}

type AsaasSubscriptionResponse = {
  id: string;
};

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
  }
): Promise<boolean> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(
      'id, user_id, plan_id, status, billing_term, pending_billing_term, combo_total_cents, combo_installments, current_cycle, loyalty_level, started_at, asaas_subscription_id, asaas_customer_id, promo_code, shipping_cents, special_notes, plans!plan_id(id, slug, name, price_cents)'
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

  if (subscription.asaas_subscription_id) {
    await cancelAsaasSubscriptionBestEffort(subscription.asaas_subscription_id);
  }

  const now = new Date();
  const prepaidMonths = prepaidMonthsForTerm(pendingTerm) ?? 0;
  const prepaidUntil = addMonths(now, prepaidMonths);
  const currentCycle = subscription.current_cycle ?? 1;
  const nextCycleStart = currentCycle + 1;

  let newAsaasSubscriptionId: string | null = null;

  if (subscription.asaas_customer_id && asaasCard) {
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
      asaas_subscription_id: newAsaasSubscriptionId,
      current_period_start: now.toISOString(),
      current_period_end: prepaidUntil.toISOString(),
      next_billing_date: prepaidUntil.toISOString(),
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
      'id, user_id, status, plan_id, address_id, asaas_subscription_id, asaas_customer_id, pending_plan_id, pending_billing_term, billing_term, promo_code, shipping_cents, shipping_region, special_notes, plans!plan_id(id, slug, name, price_cents)'
    )
    .eq('id', input.subscriptionId)
    .eq('user_id', input.userId)
    .maybeSingle();

  if (!subscription) {
    return { error: 'Assinatura não encontrada.' };
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
  const charge = await resolveSubscriptionRecurringCharge(
    admin,
    plan,
    subscription
  );

  const checkoutData = buildCheckoutDataFromSubscription(
    subscription,
    plan,
    input.billingTerm,
    installmentCount,
    charge.planCents
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

    const { data: paymentRow } = await input.supabase
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
