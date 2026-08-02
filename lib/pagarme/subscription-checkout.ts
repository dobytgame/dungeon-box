import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanSlug } from '@/lib/checkout/plans';
import type { BillingTerm } from '@/lib/checkout/combo-billing';
import {
  comboInterestFreeMax,
  isComboTerm,
  prepaidMonthsForTerm,
} from '@/lib/checkout/combo-billing';
import { getOrCreatePagarmeCustomer } from '@/lib/pagarme/customer';
import { resolveLatestPagarmeCustomerCardId } from '@/lib/pagarme/cards';
import {
  assertPagarmeCreditCardOrderPaid,
  chargePagarmeOneTimeOrder,
  isPagarmeChargePaid,
  resolvePagarmeOrderCardId,
  resolvePagarmeOrderChargeIds,
} from '@/lib/pagarme/one-time-order';
import {
  buildPagarmeSubscriptionComboCode,
  buildPagarmeSubscriptionOneTimeCode,
} from '@/lib/pagarme/store-order-code';
import { syncPagarmeComboOrderPayment } from '@/lib/pagarme/combo-payment';
import { pagarmeRequest } from '@/lib/pagarme/client';
import { cancelPagarmeSubscriptionBestEffort } from '@/lib/pagarme/subscription-api';
import { buildPagarmeSubscriptionCardPayload } from '@/lib/pagarme/subscription-card-payload';
import type { PagarmeBillingAddressInput } from '@/lib/pagarme/subscription-card-payload';
import { createAdminClient } from '@/lib/supabase/admin';

export type { PagarmeBillingAddressInput };

export type CreatePagarmeSubscriptionInput = {
  userId: string;
  planSlug: PlanSlug;
  planId: string;
  planName: string;
  priceCents: number;
  billingTerm: BillingTerm;
  installmentCount?: number;
  comboTotalCents?: number;
  promoCode?: string | null;
  addressId: string;
  specialNotes: string | null;
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
  cardToken?: string;
  /** Reuso após 1ª assinatura (token é de uso único). */
  cardId?: string | null;
  cardLast4: string;
  cardBrand: string;
  billingAddress: PagarmeBillingAddressInput;
  retrySubscriptionId: string | null;
  shippingCents: number;
  shippingRegion: string;
  oneTimeCents: number;
  oneTimeDescription: string | null;
};

export type CreatePagarmeSubscriptionResult = {
  subscriptionId: string;
  pagarmeSubscriptionId: string;
  pagarmeCustomerId: string;
  pagarmeCardId?: string | null;
  comboOrderId?: string | null;
};

type PagarmeSubscriptionResponse = {
  id: string;
  status?: string;
  next_billing_at?: string;
  card?: { id?: string };
};

function buildBillingAddress(
  address: CreatePagarmeSubscriptionInput['address']
): PagarmeBillingAddressInput {
  return {
    line_1: `${address.number}, ${address.street}, ${address.neighborhood}`,
    line_2: address.complement ?? undefined,
    zip_code: address.zip_code.replace(/\D/g, ''),
    city: address.city,
    state: address.state,
    country: 'BR',
  };
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function formatPagarmeDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function comboLabel(term: Exclude<BillingTerm, 'monthly'>): string {
  if (term === 'combo_3') return '3 meses';
  if (term === 'combo_6') return '6 meses';
  return '12 meses';
}

/** Garante start_at no futuro (data UTC), mínimo D+1. */
function resolveComboRenewalStartAt(prepaidUntil: Date, now: Date): Date {
  const minStart = addMonths(now, 0);
  minStart.setUTCDate(minStart.getUTCDate() + 1);
  minStart.setUTCHours(0, 0, 0, 0);

  const renewal = new Date(prepaidUntil);
  renewal.setUTCHours(0, 0, 0, 0);

  return renewal.getTime() > minStart.getTime() ? renewal : minStart;
}

async function resolveCardIdAfterTokenCharge(input: {
  order: Awaited<ReturnType<typeof chargePagarmeOneTimeOrder>>;
  customerId: string;
}): Promise<string> {
  const fromOrder = await resolvePagarmeOrderCardId(input.order);
  if (fromOrder) return fromOrder;

  const fromWallet = await resolveLatestPagarmeCustomerCardId(input.customerId);
  if (fromWallet) return fromWallet;

  throw new Error(
    'Pagamento aprovado, mas não foi possível vincular o cartão à renovação. Contate o suporte.'
  );
}

export async function createPagarmeSubscription(
  supabase: SupabaseClient,
  input: CreatePagarmeSubscriptionInput
): Promise<CreatePagarmeSubscriptionResult> {
  const isCombo = isComboTerm(input.billingTerm);
  const prepaidMonths = prepaidMonthsForTerm(input.billingTerm);
  const installmentCount = isCombo
    ? Math.min(Math.max(1, input.installmentCount ?? 1), 12)
    : 1;

  const pagarmeCustomerId = await getOrCreatePagarmeCustomer(
    supabase,
    input.profile,
    input.address
  );

  if (input.retrySubscriptionId) {
    const { data: previous } = await supabase
      .from('subscriptions')
      .select('pagarme_subscription_id, asaas_subscription_id')
      .eq('id', input.retrySubscriptionId)
      .eq('user_id', input.userId)
      .maybeSingle();

    if (previous?.pagarme_subscription_id) {
      await cancelPagarmeSubscriptionBestEffort(previous.pagarme_subscription_id);
    }
  }

  const now = new Date();
  const prepaidUntil =
    isCombo && prepaidMonths ? addMonths(now, prepaidMonths) : null;

  const row = {
    plan_id: input.planId,
    address_id: input.addressId,
    special_notes: input.specialNotes,
    status: 'pending' as const,
    pagarme_customer_id: pagarmeCustomerId,
    pagarme_subscription_id: null,
    asaas_subscription_id: null,
    stripe_subscription_id: null,
    mp_subscription_id: null,
    promo_code: input.promoCode ?? null,
    shipping_cents: input.shippingCents,
    shipping_region: input.shippingRegion,
    billing_term: input.billingTerm,
    prepaid_months: prepaidMonths,
    prepaid_until: prepaidUntil?.toISOString() ?? null,
    combo_total_cents: isCombo ? input.comboTotalCents ?? null : null,
    combo_installments: isCombo ? installmentCount : null,
    card_last4: input.cardLast4,
    card_brand: input.cardBrand,
    updated_at: now.toISOString(),
  };

  let subscriptionId: string;

  if (input.retrySubscriptionId) {
    const { data, error } = await supabase
      .from('subscriptions')
      .update(row)
      .eq('id', input.retrySubscriptionId)
      .eq('user_id', input.userId)
      .eq('status', 'pending')
      .select('id')
      .single();

    if (error || !data) {
      throw new Error('Não foi possível atualizar a assinatura.');
    }
    subscriptionId = data.id;
  } else {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        user_id: input.userId,
        ...row,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error('Não foi possível salvar a assinatura.');
    }
    subscriptionId = data.id;
  }

  const billingAddress = input.billingAddress;
  const admin = createAdminClient();

  if (isCombo) {
    const comboTotal = input.comboTotalCents ?? 0;
    if (comboTotal <= 0) {
      throw new Error('Valor do combo inválido.');
    }

    // Cobrança inicial com token (leva CVV). card_id sem CVV é recusado na 1ª compra.
    if (!input.cardToken?.trim()) {
      throw new Error('Token do cartão obrigatório para pagar o combo.');
    }

    const term = input.billingTerm as Exclude<BillingTerm, 'monthly'>;
    const comboOrder = await chargePagarmeOneTimeOrder({
      customerId: pagarmeCustomerId,
      valueCents: comboTotal,
      description: `DungeonBox — Combo ${comboLabel(term)} (${input.planName})`,
      cardToken: input.cardToken,
      billingAddress,
      orderCode: buildPagarmeSubscriptionComboCode(subscriptionId),
      installments: installmentCount,
      metadata: {
        subscription_id: subscriptionId,
        charge_kind: 'combo',
        billing_term: input.billingTerm,
        plan_slug: input.planSlug,
        interest_free_max: String(
          comboInterestFreeMax(input.planSlug, input.billingTerm)
        ),
      },
    });

    assertPagarmeCreditCardOrderPaid(
      comboOrder,
      'Pagamento do combo recusado. Verifique os dados do cartão e tente novamente.'
    );

    const chargeIds = resolvePagarmeOrderChargeIds(comboOrder);
    const comboPaid = isPagarmeChargePaid(chargeIds.chargeStatus);
    const savedCardId = await resolveCardIdAfterTokenCharge({
      order: comboOrder,
      customerId: pagarmeCustomerId,
    });

    const comboPaymentPayload = {
      user_id: input.userId,
      subscription_id: subscriptionId,
      pagarme_order_id: comboOrder.id,
      amount_cents: comboTotal,
      currency: 'BRL',
      status: comboPaid ? ('approved' as const) : ('pending' as const),
      paid_at: comboPaid ? now.toISOString() : null,
      installments: installmentCount,
      payment_method: 'credit_card',
      status_detail: JSON.stringify({
        type: 'combo_prepaid',
        billing_term: input.billingTerm,
        combo_total_cents: comboTotal,
        combo_installments:
          installmentCount > 1 ? installmentCount : undefined,
        gateway: 'pagarme',
      }),
    };

    if (chargeIds.chargeId) {
      const { error: comboPaymentRowError } = await admin
        .from('payments')
        .upsert(
          {
            ...comboPaymentPayload,
            pagarme_charge_id: chargeIds.chargeId,
          },
          { onConflict: 'pagarme_charge_id' }
        );

      if (comboPaymentRowError) {
        console.error(
          '[pagarme] combo pending payment row:',
          subscriptionId,
          comboPaymentRowError.message
        );
      }
    } else {
      const { error: comboPaymentRowError } = await admin
        .from('payments')
        .insert(comboPaymentPayload);

      if (comboPaymentRowError) {
        console.error(
          '[pagarme] combo pending payment row:',
          subscriptionId,
          comboPaymentRowError.message
        );
      }
    }

    const renewalStart = resolveComboRenewalStartAt(
      prepaidUntil ?? addMonths(now, prepaidMonths ?? 1),
      now
    );

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
          start_at: formatPagarmeDate(renewalStart),
          customer_id: pagarmeCustomerId,
          ...buildPagarmeSubscriptionCardPayload({
            cardId: savedCardId,
            billingAddress,
          }),
          items: [
            {
              description: `DungeonBox — ${input.planName} (renovação mensal)`,
              quantity: 1,
              pricing_scheme: {
                scheme_type: 'unit',
                price: input.priceCents,
              },
            },
          ],
          metadata: {
            subscription_id: subscriptionId,
            plan_slug: input.planSlug,
            billing_term: input.billingTerm,
          },
        },
      }
    );

    const { error: linkError } = await supabase
      .from('subscriptions')
      .update({
        pagarme_subscription_id: pagarmeSubscription.id,
        pagarme_customer_id: pagarmeCustomerId,
        prepaid_until: renewalStart.toISOString(),
        next_billing_date:
          pagarmeSubscription.next_billing_at ?? renewalStart.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (linkError) {
      await cancelPagarmeSubscriptionBestEffort(pagarmeSubscription.id);
      throw new Error('Não foi possível vincular a assinatura.');
    }

    if (comboPaid) {
      await syncPagarmeComboOrderPayment(admin, comboOrder, subscriptionId);
    }

    return {
      subscriptionId,
      pagarmeSubscriptionId: pagarmeSubscription.id,
      pagarmeCustomerId,
      pagarmeCardId: savedCardId,
      comboOrderId: comboOrder.id,
    };
  }

  // Mensal: token na 1ª assinatura (CVV). Planos seguintes reusam card_id.
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
        customer_id: pagarmeCustomerId,
        ...buildPagarmeSubscriptionCardPayload({
          cardId: input.cardId,
          cardToken: input.cardToken,
          billingAddress,
        }),
        items: [
          {
            description: `DungeonBox — ${input.planName}`,
            quantity: 1,
            pricing_scheme: {
              scheme_type: 'unit',
              price: input.priceCents,
            },
          },
        ],
        metadata: {
          subscription_id: subscriptionId,
          plan_slug: input.planSlug,
        },
      },
    }
  );

  const { error: linkError } = await supabase
    .from('subscriptions')
    .update({
      pagarme_subscription_id: pagarmeSubscription.id,
      pagarme_customer_id: pagarmeCustomerId,
      next_billing_date: pagarmeSubscription.next_billing_at ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId);

  if (linkError) {
    await cancelPagarmeSubscriptionBestEffort(pagarmeSubscription.id);
    throw new Error('Não foi possível vincular a assinatura.');
  }

  if (input.oneTimeCents > 0) {
    try {
      const cardId =
        pagarmeSubscription.card?.id?.trim() ||
        input.cardId?.trim() ||
        (await resolveLatestPagarmeCustomerCardId(pagarmeCustomerId));

      if (!cardId) {
        throw new Error(
          'Assinatura criada, mas o cartão não ficou disponível para a cobrança única.'
        );
      }

      await chargePagarmeOneTimeOrder({
        customerId: pagarmeCustomerId,
        valueCents: input.oneTimeCents,
        description:
          input.oneTimeDescription ?? 'DungeonBox — cobrança única (1ª caixa)',
        cardId,
        billingAddress,
        orderCode: buildPagarmeSubscriptionOneTimeCode(subscriptionId),
        metadata: {
          subscription_id: subscriptionId,
          charge_kind: 'one-time',
        },
      });
    } catch (error) {
      await cancelPagarmeSubscriptionBestEffort(pagarmeSubscription.id);
      throw error;
    }
  }

  return {
    subscriptionId,
    pagarmeSubscriptionId: pagarmeSubscription.id,
    pagarmeCustomerId,
    pagarmeCardId:
      pagarmeSubscription.card?.id?.trim() || input.cardId?.trim() || null,
  };
}

export { buildBillingAddress };
