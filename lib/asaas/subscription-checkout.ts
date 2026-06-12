import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanSlug } from '@/lib/checkout/plans';
import { getOrCreateAsaasCustomer } from '@/lib/asaas/customer';
import { asaasRequest } from '@/lib/asaas/client';
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
};

export type CreateAsaasSubscriptionResult = {
  subscriptionId: string;
  asaasSubscriptionId: string;
  asaasCustomerId: string;
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

export async function createAsaasSubscription(
  supabase: SupabaseClient,
  input: CreateAsaasSubscriptionInput
): Promise<CreateAsaasSubscriptionResult> {
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

  const row = {
    plan_id: input.planId,
    address_id: input.addressId,
    special_notes: input.specialNotes,
    status: 'pending' as const,
    asaas_customer_id: asaasCustomerId,
    promo_code: input.promoCode ?? null,
    updated_at: new Date().toISOString(),
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

  return {
    subscriptionId,
    asaasSubscriptionId: asaasSubscription.id,
    asaasCustomerId,
  };
}
