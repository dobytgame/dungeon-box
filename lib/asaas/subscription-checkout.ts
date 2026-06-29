import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanSlug } from '@/lib/checkout/plans';
import type { BillingTerm } from '@/lib/checkout/combo-billing';
import {
  calculateComboTotalCents,
  comboInterestFreeMax,
  isComboTerm,
  prepaidMonthsForTerm,
} from '@/lib/checkout/combo-billing';
import { getOrCreateAsaasCustomer } from '@/lib/asaas/customer';
import { asaasRequest } from '@/lib/asaas/client';
import { chargeAsaasOneTimePayment } from '@/lib/asaas/one-time-payment';
import { cancelAsaasSubscriptionBestEffort } from '@/lib/asaas/subscription-api';

export type AsaasCreditCardInput = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
};

export type AsaasCreditCardHolderInput = {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  addressComplement?: string;
  phone: string;
};

export type CreateAsaasSubscriptionInput = {
  userId: string;
  planSlug: PlanSlug;
  planId: string;
  planName: string;
  priceCents: number;
  billingTerm: BillingTerm;
  installmentCount: number;
  comboTotalCents?: number;
  promoCode?: string | null;
  addressId: string;
  specialNotes: string | null;
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
  creditCard: AsaasCreditCardInput;
  creditCardHolderInfo: AsaasCreditCardHolderInput;
  retrySubscriptionId: string | null;
  shippingCents: number;
  shippingRegion: string;
  oneTimeCents: number;
  oneTimeDescription: string | null;
};

export type CreateAsaasSubscriptionResult = {
  subscriptionId: string;
  asaasSubscriptionId: string | null;
  asaasCustomerId: string;
  comboPaymentId?: string | null;
};

type AsaasSubscriptionResponse = {
  id: string;
  customer: string;
  status?: string;
};

function formatAsaasDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function centsToReais(cents: number): number {
  return Math.round(cents) / 100;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export async function createAsaasSubscription(
  supabase: SupabaseClient,
  input: CreateAsaasSubscriptionInput
): Promise<CreateAsaasSubscriptionResult> {
  const isCombo = isComboTerm(input.billingTerm);
  const prepaidMonths = prepaidMonthsForTerm(input.billingTerm);

  const asaasCustomerId = await getOrCreateAsaasCustomer(
    supabase,
    input.profile,
    input.address
  );

  if (input.retrySubscriptionId) {
    const { data: previous } = await supabase
      .from('subscriptions')
      .select('asaas_subscription_id')
      .eq('id', input.retrySubscriptionId)
      .eq('user_id', input.userId)
      .maybeSingle();

    if (previous?.asaas_subscription_id) {
      await cancelAsaasSubscriptionBestEffort(previous.asaas_subscription_id);
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
    asaas_customer_id: asaasCustomerId,
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
    combo_installments: isCombo ? input.installmentCount : null,
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

  if (isCombo) {
    const comboTotal = input.comboTotalCents ?? 0;
    if (comboTotal <= 0) {
      throw new Error('Valor do combo inválido.');
    }

    const comboLabel =
      input.billingTerm === 'combo_3'
        ? '3 meses'
        : input.billingTerm === 'combo_6'
          ? '6 meses'
          : '12 meses';

    const comboPayment = await chargeAsaasOneTimePayment({
      customerId: asaasCustomerId,
      valueCents: comboTotal,
      description: `DungeonBox — Combo ${comboLabel} (${input.planName})`,
      remoteIp: input.remoteIp,
      creditCard: input.creditCard,
      creditCardHolderInfo: input.creditCardHolderInfo,
      externalReference: `${subscriptionId}:combo`,
      installmentCount: input.installmentCount,
      interestFreeMax: comboInterestFreeMax(input.planSlug, input.billingTerm),
    });

    const renewalStart = prepaidUntil ?? addMonths(now, 1);

    const asaasSubscription = await asaasRequest<AsaasSubscriptionResponse>(
      '/subscriptions/',
      {
        method: 'POST',
        body: {
          customer: asaasCustomerId,
          billingType: 'CREDIT_CARD',
          cycle: 'MONTHLY',
          value: centsToReais(input.priceCents),
          nextDueDate: formatAsaasDate(renewalStart),
          description: `DungeonBox — ${input.planName} (renovação mensal)`,
          externalReference: subscriptionId,
          creditCard: input.creditCard,
          creditCardHolderInfo: input.creditCardHolderInfo,
          remoteIp: input.remoteIp,
        },
      }
    );

    const { error: linkError } = await supabase
      .from('subscriptions')
      .update({
        asaas_subscription_id: asaasSubscription.id,
        asaas_customer_id: asaasCustomerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (linkError) {
      await cancelAsaasSubscriptionBestEffort(asaasSubscription.id);
      throw new Error('Não foi possível vincular a assinatura.');
    }

    return {
      subscriptionId,
      asaasSubscriptionId: asaasSubscription.id,
      asaasCustomerId,
      comboPaymentId: comboPayment.id,
    };
  }

  const asaasSubscription = await asaasRequest<AsaasSubscriptionResponse>(
    '/subscriptions/',
    {
      method: 'POST',
      body: {
        customer: asaasCustomerId,
        billingType: 'CREDIT_CARD',
        cycle: 'MONTHLY',
        value: centsToReais(input.priceCents),
        nextDueDate: formatAsaasDate(new Date()),
        description: `DungeonBox — ${input.planName}`,
        externalReference: subscriptionId,
        creditCard: input.creditCard,
        creditCardHolderInfo: input.creditCardHolderInfo,
        remoteIp: input.remoteIp,
      },
    }
  );

  const { error: linkError } = await supabase
    .from('subscriptions')
    .update({
      asaas_subscription_id: asaasSubscription.id,
      asaas_customer_id: asaasCustomerId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId);

  if (linkError) {
    await cancelAsaasSubscriptionBestEffort(asaasSubscription.id);
    throw new Error('Não foi possível vincular a assinatura.');
  }

  if (input.oneTimeCents > 0) {
    try {
      await chargeAsaasOneTimePayment({
        customerId: asaasCustomerId,
        valueCents: input.oneTimeCents,
        description:
          input.oneTimeDescription ?? 'DungeonBox — cobrança única (1ª caixa)',
        remoteIp: input.remoteIp,
        creditCard: input.creditCard,
        creditCardHolderInfo: input.creditCardHolderInfo,
        externalReference: `${subscriptionId}:one-time`,
        installmentCount: 1,
      });
    } catch (error) {
      await cancelAsaasSubscriptionBestEffort(asaasSubscription.id);
      throw error;
    }
  }

  return {
    subscriptionId,
    asaasSubscriptionId: asaasSubscription.id,
    asaasCustomerId,
  };
}
