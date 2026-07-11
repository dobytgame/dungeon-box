import type { SupabaseClient } from '@supabase/supabase-js';
import { ASAAS_CONFIGURED } from '@/lib/asaas/client';
import { getOrCreateAsaasCustomer } from '@/lib/asaas/customer';
import { userFacingAsaasError } from '@/lib/asaas/errors';
import { createAsaasPixPayment } from '@/lib/asaas/one-time-payment';
import {
  asaasPaymentShareUrl,
  fetchAsaasPaymentDetails,
} from '@/lib/asaas/payment-details';
import { cancelAsaasSubscriptionBestEffort } from '@/lib/asaas/subscription-api';
import {
  BILLING_TERMS,
  calculateComboTotalCents,
  COMBO_OPTIONS,
  isComboTerm,
  prepaidMonthsForTerm,
  type BillingTerm,
} from '@/lib/checkout/combo-billing';
import type { CheckoutData } from '@/lib/checkout/types';
import type { PlanSlug } from '@/lib/checkout/plans';
import {
  recordPromoRedemption,
  resolvePromoCode,
} from '@/lib/checkout/promo-codes';
import { getSiteUrl } from '@/lib/email/config';
import { notifySubscriptionPixPayment } from '@/lib/email/subscription-pix-notify';
import { findBlockingSubscriptionForPlan } from '@/lib/subscriptions/find-blocking';
import { prepareCheckoutSubscription } from '@/lib/subscriptions/pending-checkout';
import { ShippingQuoteError, shippingMonthlyCents } from '@/lib/shipping/quote';
import { resolveShippingForCheckout } from '@/lib/shipping/resolve-server';

export type AdminCreateSubscriptionPixInput = {
  userId: string;
  planSlug: PlanSlug;
  addressId: string;
  billingTerm: BillingTerm;
  couponCode?: string | null;
  specialNotes?: string | null;
};

export type AdminCreateSubscriptionPixResult = {
  subscriptionId: string;
  paymentId: string;
  amountCents: number;
  planName: string;
  pix: {
    encodedImage: string;
    payload: string;
    expirationDate: string;
  };
  paymentUrl: string;
  emailSent: boolean;
};

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function comboLabel(term: BillingTerm): string {
  return COMBO_OPTIONS.find((option) => option.term === term)?.label ?? term;
}

export async function createAdminSubscriptionWithPix(
  admin: SupabaseClient,
  input: AdminCreateSubscriptionPixInput
): Promise<AdminCreateSubscriptionPixResult> {
  if (!ASAAS_CONFIGURED) {
    throw new Error('Asaas não configurado.');
  }

  if (!BILLING_TERMS.includes(input.billingTerm)) {
    throw new Error('Forma de cobrança inválida.');
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, cpf, full_name, phone, asaas_customer_id')
    .eq('id', input.userId)
    .maybeSingle();

  if (!profile?.email) {
    throw new Error('Cliente sem e-mail cadastrado.');
  }

  const cpf = profile.cpf?.replace(/\D/g, '') ?? '';
  if (cpf.length !== 11) {
    throw new Error('Cliente precisa ter CPF cadastrado para gerar PIX.');
  }

  const phone = profile.phone?.replace(/\D/g, '') ?? '';
  if (phone.length < 10) {
    throw new Error('Cliente precisa ter telefone cadastrado para gerar PIX.');
  }

  const { data: plan } = await admin
    .from('plans')
    .select('id, name, price_cents, slug')
    .eq('slug', input.planSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (!plan) {
    throw new Error('Plano não encontrado.');
  }

  const { data: address } = await admin
    .from('addresses')
    .select(
      'id, recipient, zip_code, street, number, complement, neighborhood, city, state'
    )
    .eq('id', input.addressId)
    .eq('user_id', input.userId)
    .maybeSingle();

  if (!address) {
    throw new Error('Endereço de entrega inválido.');
  }

  const existingSub = await findBlockingSubscriptionForPlan(
    admin,
    input.userId,
    plan.id
  );
  const checkoutPrep = await prepareCheckoutSubscription(admin, existingSub);

  if (checkoutPrep.kind === 'blocked') {
    throw new Error(checkoutPrep.message);
  }

  if (checkoutPrep.kind === 'activated') {
    throw new Error('Este cliente já possui assinatura ativa deste plano.');
  }

  const retrySubscriptionId =
    checkoutPrep.kind === 'retry' ? checkoutPrep.subscriptionId : null;

  if (retrySubscriptionId) {
    const { data: previous } = await admin
      .from('subscriptions')
      .select('asaas_subscription_id')
      .eq('id', retrySubscriptionId)
      .maybeSingle();

    if (previous?.asaas_subscription_id) {
      await cancelAsaasSubscriptionBestEffort(previous.asaas_subscription_id);
    }
  }

  let shippingQuote;
  try {
    shippingQuote = await resolveShippingForCheckout(
      admin,
      input.userId,
      input.planSlug,
      input.addressId,
      {
        couponCode: input.couponCode,
        promoSupabase: input.couponCode?.trim() ? admin : undefined,
      }
    );
  } catch (error) {
    if (error instanceof ShippingQuoteError) {
      throw new Error(error.message);
    }
    throw error;
  }

  const freightMonthlyCents = shippingMonthlyCents(shippingQuote);
  let chargePriceCents = plan.price_cents as number;
  let resolvedCoupon: Awaited<ReturnType<typeof resolvePromoCode>> | null = null;

  if (input.couponCode?.trim()) {
    try {
      resolvedCoupon = await resolvePromoCode(
        admin,
        input.couponCode,
        input.planSlug,
        input.userId,
        plan.price_cents as number
      );
      chargePriceCents = resolvedCoupon.discountedPriceCents;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : 'Cupom inválido.'
      );
    }
  }

  chargePriceCents += freightMonthlyCents;

  const isCombo = isComboTerm(input.billingTerm);
  let chargeTotalCents = chargePriceCents;

  if (isCombo) {
    const checkoutSnapshot: CheckoutData = {
      planSlugs: [input.planSlug],
      billingTerm: input.billingTerm,
      installmentCount: 1,
      paintKitBump: null,
      paintKitBumpRecurring: false,
      addressId: input.addressId,
      specialNotes: input.specialNotes ?? '',
      discountedPlanCentsByPlan: resolvedCoupon
        ? {
            [input.planSlug]:
              chargePriceCents - freightMonthlyCents,
          }
        : undefined,
      shippingByPlan: {
        [input.planSlug]: {
          cents: freightMonthlyCents,
          free: freightMonthlyCents === 0,
          region: shippingQuote.region,
          label: shippingQuote.label ?? shippingQuote.region,
          etaDaysMin: shippingQuote.etaDaysMin,
          etaDaysMax: shippingQuote.etaDaysMax,
        },
      },
    };
    chargeTotalCents = calculateComboTotalCents(
      checkoutSnapshot,
      input.billingTerm as Exclude<BillingTerm, 'monthly'>
    );
  }

  if (chargeTotalCents <= 0) {
    throw new Error('Valor de cobrança inválido.');
  }

  const asaasCustomerId = await getOrCreateAsaasCustomer(
    admin,
    {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      cpf: profile.cpf,
      phone: profile.phone,
      asaas_customer_id: profile.asaas_customer_id,
    },
    address
  );

  const now = new Date();
  const prepaidMonths = prepaidMonthsForTerm(input.billingTerm);
  const prepaidUntil =
    isCombo && prepaidMonths ? addMonths(now, prepaidMonths) : null;

  const subscriptionRow = {
    plan_id: plan.id,
    address_id: input.addressId,
    special_notes: input.specialNotes?.trim() || null,
    status: 'pending' as const,
    asaas_customer_id: asaasCustomerId,
    asaas_subscription_id: null,
    stripe_subscription_id: null,
    mp_subscription_id: null,
    promo_code: resolvedCoupon?.promo.code ?? null,
    shipping_cents: freightMonthlyCents,
    shipping_region: shippingQuote.region,
    billing_term: input.billingTerm,
    prepaid_months: prepaidMonths,
    prepaid_until: prepaidUntil?.toISOString() ?? null,
    combo_total_cents: isCombo ? chargeTotalCents : null,
    combo_installments: isCombo ? 1 : null,
    updated_at: now.toISOString(),
  };

  let subscriptionId: string;

  if (retrySubscriptionId) {
    const { data, error } = await admin
      .from('subscriptions')
      .update(subscriptionRow)
      .eq('id', retrySubscriptionId)
      .eq('user_id', input.userId)
      .eq('status', 'pending')
      .select('id')
      .single();

    if (error || !data) {
      throw new Error('Não foi possível atualizar a assinatura pendente.');
    }
    subscriptionId = data.id;
  } else {
    const { data, error } = await admin
      .from('subscriptions')
      .insert({
        user_id: input.userId,
        ...subscriptionRow,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error('Não foi possível criar a assinatura.');
    }
    subscriptionId = data.id;
  }

  const description = isCombo
    ? `DungeonBox — ${comboLabel(input.billingTerm)} (${plan.name})`
    : `DungeonBox — ${plan.name}`;

  const externalReference = isCombo
    ? `${subscriptionId}:combo`
    : subscriptionId;

  let pixPayment;
  try {
    pixPayment = await createAsaasPixPayment({
      customerId: asaasCustomerId,
      valueCents: chargeTotalCents,
      description,
      externalReference,
    });
  } catch (error) {
    throw new Error(userFacingAsaasError(error));
  }

  const { data: paymentRow, error: paymentError } = await admin
    .from('payments')
    .upsert(
      {
        user_id: input.userId,
        subscription_id: subscriptionId,
        asaas_payment_id: pixPayment.id,
        amount_cents: chargeTotalCents,
        currency: 'BRL',
        status: 'pending',
        payment_method: 'pix',
        installments: 1,
        status_detail: isCombo
          ? JSON.stringify({
              type: 'combo_prepaid',
              billing_term: input.billingTerm,
              combo_total_cents: chargeTotalCents,
            })
          : null,
      },
      { onConflict: 'asaas_payment_id' }
    )
    .select('id')
    .single();

  if (paymentError || !paymentRow) {
    throw new Error('Não foi possível registrar o pagamento PIX.');
  }

  if (resolvedCoupon) {
    await recordPromoRedemption(
      admin,
      resolvedCoupon.promo.id,
      input.userId,
      subscriptionId,
      resolvedCoupon.promo.code
    );
  }

  const remote = await fetchAsaasPaymentDetails(pixPayment.id);
  const paymentUrl =
    asaasPaymentShareUrl(remote) ?? `${getSiteUrl()}/dashboard/subscription`;

  const emailNotify = await notifySubscriptionPixPayment(admin, {
    userId: input.userId,
    planName: plan.name as string,
    amountCents: chargeTotalCents,
    paymentUrl,
    pixPayload: pixPayment.pix.payload,
    expirationDate: pixPayment.pix.expirationDate,
  });

  return {
    subscriptionId,
    paymentId: paymentRow.id as string,
    amountCents: chargeTotalCents,
    planName: plan.name as string,
    pix: pixPayment.pix,
    paymentUrl,
    emailSent: emailNotify.sent,
  };
}
