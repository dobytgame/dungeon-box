import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanSlug } from '@/lib/checkout/plans';
import type { BillingTerm } from '@/lib/checkout/combo-billing';
import { isComboTerm } from '@/lib/checkout/combo-billing';
import { getOrCreatePagarmeCustomer } from '@/lib/pagarme/customer';
import { chargePagarmeOneTimeOrder } from '@/lib/pagarme/one-time-order';
import { pagarmeRequest } from '@/lib/pagarme/client';
import {
  cancelPagarmeSubscriptionBestEffort,
} from '@/lib/pagarme/subscription-api';

export type PagarmeBillingAddressInput = {
  line_1: string;
  line_2?: string;
  zip_code: string;
  city: string;
  state: string;
  country?: string;
};

export type CreatePagarmeSubscriptionInput = {
  userId: string;
  planSlug: PlanSlug;
  planId: string;
  planName: string;
  priceCents: number;
  billingTerm: BillingTerm;
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
  cardToken: string;
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
};

type PagarmeSubscriptionResponse = {
  id: string;
  status?: string;
  next_billing_at?: string;
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

export async function createPagarmeSubscription(
  supabase: SupabaseClient,
  input: CreatePagarmeSubscriptionInput
): Promise<CreatePagarmeSubscriptionResult> {
  if (isComboTerm(input.billingTerm)) {
    throw new Error('Combos disponíveis apenas com Asaas no momento.');
  }

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
    prepaid_months: null,
    prepaid_until: null,
    combo_total_cents: null,
    combo_installments: null,
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
        card: {
          card_token: input.cardToken,
          billing_address: {
            ...billingAddress,
            country: billingAddress.country ?? 'BR',
          },
        },
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
      await chargePagarmeOneTimeOrder({
        customerId: pagarmeCustomerId,
        valueCents: input.oneTimeCents,
        description:
          input.oneTimeDescription ?? 'DungeonBox — cobrança única (1ª caixa)',
        cardToken: input.cardToken,
        billingAddress,
        externalReference: `${subscriptionId}:one-time`,
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
  };
}

export { buildBillingAddress };
