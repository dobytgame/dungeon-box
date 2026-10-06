import type { SupabaseClient } from '@supabase/supabase-js';
import {
  calculateComboTotalCents,
  COMBO_OPTIONS,
  isComboTerm,
  prepaidMonthsForTerm,
  type BillingTerm,
} from '@/lib/checkout/combo-billing';
import type { CheckoutData } from '@/lib/checkout/types';
import type { PlanSlug } from '@/lib/checkout/plans';
import { getPaintKitBump, type PaintKitBumpId } from '@/lib/checkout/order-bumps';
import { buildSpecialNotes } from '@/lib/checkout/special-notes';
import {
  recordPromoRedemption,
  resolvePromoCode,
} from '@/lib/checkout/promo-codes';
import { asaasRequest, ASAAS_CONFIGURED } from '@/lib/asaas/client';
import { getOrCreateAsaasCustomer } from '@/lib/asaas/customer';
import { userFacingAsaasError } from '@/lib/asaas/errors';
import { handleComboPaymentConfirmed } from '@/lib/asaas/combo-payment';
import {
  createAsaasPixPayment,
  fetchAsaasPayment,
  fetchAsaasPixQrCode,
} from '@/lib/asaas/one-time-payment';
import { isAsaasPaymentConfirmed } from '@/lib/asaas/payment-status';
import { findBlockingSubscriptionForPlan } from '@/lib/subscriptions/find-blocking';
import { prepareCheckoutSubscription } from '@/lib/subscriptions/pending-checkout';
import { ShippingQuoteError, shippingMonthlyCents } from '@/lib/shipping/quote';
import { resolveShippingForCheckout } from '@/lib/shipping/resolve-server';
import type { MarketingAttributionRecord } from '@/lib/marketing/attribution';

export type AsaasCheckoutComboPixInput = {
  userId: string;
  planSlug: PlanSlug;
  addressId: string;
  billingTerm: BillingTerm;
  couponCode?: string | null;
  specialNotes?: string | null;
  paintKitBump?: PaintKitBumpId | null;
  paintKitBumpRecurring?: boolean;
  marketingAttribution?: MarketingAttributionRecord | null;
};

export type AsaasCheckoutComboPixResult = {
  subscriptionId: string;
  paymentId: string;
  amountCents: number;
  planName: string;
  pix: {
    encodedImage?: string;
    payload: string;
    expirationDate: string;
    imageUrl?: string;
  };
  alreadyPaid: boolean;
};

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function comboLabel(term: BillingTerm): string {
  return COMBO_OPTIONS.find((option) => option.term === term)?.label ?? term;
}

async function cancelPendingAsaasPixPayments(
  admin: SupabaseClient,
  subscriptionId: string
) {
  const { data: rows } = await admin
    .from('payments')
    .select('id, asaas_payment_id')
    .eq('subscription_id', subscriptionId)
    .eq('status', 'pending')
    .eq('payment_method', 'pix');

  for (const row of rows ?? []) {
    const paymentId = row.asaas_payment_id as string | null;
    if (paymentId) {
      try {
        await asaasRequest(`/payments/${encodeURIComponent(paymentId)}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.warn('[asaas] cancel pending pix payment:', paymentId, error);
      }
    }

    await admin
      .from('payments')
      .update({ status: 'cancelled' })
      .eq('id', row.id)
      .eq('status', 'pending');
  }
}

export async function createAsaasCheckoutComboPix(
  admin: SupabaseClient,
  input: AsaasCheckoutComboPixInput
): Promise<AsaasCheckoutComboPixResult> {
  if (!ASAAS_CONFIGURED) {
    throw new Error('Asaas não configurado.');
  }

  if (!isComboTerm(input.billingTerm)) {
    throw new Error('PIX no checkout está disponível apenas para combos.');
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, cpf, full_name, phone, asaas_customer_id')
    .eq('id', input.userId)
    .maybeSingle();

  if (!profile?.email) {
    throw new Error('Perfil incompleto. Atualize seu e-mail no cadastro.');
  }

  const cpf = profile.cpf?.replace(/\D/g, '') ?? '';
  if (cpf.length !== 11) {
    throw new Error('CPF obrigatório para assinatura. Complete seu perfil antes de pagar.');
  }

  const phone = profile.phone?.replace(/\D/g, '') ?? '';
  if (phone.length < 10) {
    throw new Error('Telefone obrigatório para pagamento. Cadastre seu telefone no perfil.');
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
    throw new Error('Sua assinatura deste plano já está ativa.');
  }

  const retrySubscriptionId =
    checkoutPrep.kind === 'retry' ? checkoutPrep.subscriptionId : null;

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
      throw new Error(error instanceof Error ? error.message : 'Cupom inválido.');
    }
  }

  const bump = getPaintKitBump(input.paintKitBump ?? null);
  const bumpRecurring = Boolean(input.paintKitBumpRecurring && bump);
  const bumpMonthlyCents = bump && bumpRecurring ? bump.priceCents : 0;
  chargePriceCents += freightMonthlyCents + bumpMonthlyCents;

  const checkoutSnapshot: CheckoutData = {
    planSlugs: [input.planSlug],
    billingTerm: input.billingTerm,
    installmentCount: 1,
    paintKitBump: input.paintKitBump ?? null,
    paintKitBumpRecurring: bumpRecurring,
    addressId: input.addressId,
    specialNotes: input.specialNotes ?? '',
    discountedPlanCentsByPlan: resolvedCoupon
      ? {
          [input.planSlug]:
            chargePriceCents - freightMonthlyCents - bumpMonthlyCents,
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
  const chargeTotalCents = calculateComboTotalCents(
    checkoutSnapshot,
    input.billingTerm as Exclude<BillingTerm, 'monthly'>
  );

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
  const prepaidUntil = prepaidMonths ? addMonths(now, prepaidMonths) : null;
  const builtSpecialNotes = buildSpecialNotes(
    input.paintKitBump ?? null,
    input.specialNotes ?? '',
    bumpRecurring
  );

  const subscriptionRow = {
    plan_id: plan.id,
    address_id: input.addressId,
    special_notes: builtSpecialNotes,
    status: 'pending' as const,
    asaas_customer_id: asaasCustomerId,
    asaas_subscription_id: null,
    pagarme_subscription_id: null,
    stripe_subscription_id: null,
    mp_subscription_id: null,
    promo_code: resolvedCoupon?.promo.code ?? null,
    shipping_cents: freightMonthlyCents,
    shipping_region: shippingQuote.region,
    billing_term: input.billingTerm,
    prepaid_months: prepaidMonths,
    prepaid_until: prepaidUntil?.toISOString() ?? null,
    combo_total_cents: chargeTotalCents,
    combo_installments: 1,
    updated_at: now.toISOString(),
    ...(input.marketingAttribution
      ? { marketing_attribution: input.marketingAttribution }
      : {}),
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

  const reusable = await findReusableAsaasPix(
    admin,
    subscriptionId,
    chargeTotalCents
  );
  if (reusable) {
    if (reusable.alreadyPaid) {
      await handleComboPaymentConfirmed(
        admin,
        {
          id: reusable.asaasPaymentId,
          externalReference: `${subscriptionId}:combo`,
          value: chargeTotalCents / 100,
          status: 'RECEIVED',
          billingType: 'PIX',
        },
        subscriptionId
      );
    }

    return {
      subscriptionId,
      paymentId: reusable.paymentId,
      amountCents: chargeTotalCents,
      planName: plan.name as string,
      pix: reusable.pix,
      alreadyPaid: reusable.alreadyPaid,
    };
  }

  await cancelPendingAsaasPixPayments(admin, subscriptionId);

  let pixPayment;
  try {
    pixPayment = await createAsaasPixPayment({
      customerId: asaasCustomerId,
      valueCents: chargeTotalCents,
      description: `DungeonBox — ${comboLabel(input.billingTerm)} (${plan.name}${bump ? ` + ${bump.name}` : ''})`,
      externalReference: `${subscriptionId}:combo`,
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
        status_detail: JSON.stringify({
          type: 'combo_prepaid',
          billing_term: input.billingTerm,
          combo_total_cents: chargeTotalCents,
          gateway: 'asaas',
        }),
      },
      { onConflict: 'asaas_payment_id' }
    )
    .select('id')
    .single();

  if (paymentError || !paymentRow) {
    throw new Error('Não foi possível registrar o pagamento PIX.');
  }

  if (resolvedCoupon) {
    const { data: existingRedemption } = await admin
      .from('promo_code_redemptions')
      .select('id')
      .eq('subscription_id', subscriptionId)
      .eq('promo_code_id', resolvedCoupon.promo.id)
      .maybeSingle();

    if (!existingRedemption) {
      await recordPromoRedemption(
        admin,
        resolvedCoupon.promo.id,
        input.userId,
        subscriptionId,
        resolvedCoupon.promo.code
      );
    }
  }

  return {
    subscriptionId,
    paymentId: paymentRow.id as string,
    amountCents: chargeTotalCents,
    planName: plan.name as string,
    pix: pixPayment.pix,
    alreadyPaid: false,
  };
}

async function findReusableAsaasPix(
  admin: SupabaseClient,
  subscriptionId: string,
  valueCents: number
): Promise<{
  paymentId: string;
  asaasPaymentId: string;
  alreadyPaid: boolean;
  pix: AsaasCheckoutComboPixResult['pix'];
} | null> {
  const { data: payment } = await admin
    .from('payments')
    .select('id, asaas_payment_id, amount_cents')
    .eq('subscription_id', subscriptionId)
    .eq('status', 'pending')
    .eq('payment_method', 'pix')
    .eq('amount_cents', valueCents)
    .not('asaas_payment_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const asaasPaymentId = payment?.asaas_payment_id as string | null;
  if (!payment || !asaasPaymentId) return null;

  try {
    const remote = await fetchAsaasPayment(asaasPaymentId);
    if (isAsaasPaymentConfirmed(remote.status)) {
      return {
        paymentId: payment.id as string,
        asaasPaymentId,
        alreadyPaid: true,
        pix: { payload: '', expirationDate: '' },
      };
    }

    const status = remote.status?.toUpperCase() ?? '';
    if (status !== 'PENDING' && status !== 'AWAITING_RISK_ANALYSIS') {
      return null;
    }

    const pix = await fetchAsaasPixQrCode(asaasPaymentId);
    if (!pix.payload?.trim()) return null;

    if (pix.expirationDate) {
      const expiresAt = new Date(pix.expirationDate).getTime();
      if (Number.isFinite(expiresAt) && expiresAt < Date.now() + 60_000) {
        return null;
      }
    }

    return {
      paymentId: payment.id as string,
      asaasPaymentId,
      alreadyPaid: false,
      pix,
    };
  } catch (error) {
    console.warn('[asaas] reuse pending pix skipped:', subscriptionId, error);
    return null;
  }
}
