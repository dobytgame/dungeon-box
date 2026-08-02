import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanSlug } from '@/lib/checkout/plans';
import { getOrCreatePagarmeCustomer } from '@/lib/pagarme/customer';
import { pagarmeRequest } from '@/lib/pagarme/client';
import { buildPagarmeSubscriptionCardPayload } from '@/lib/pagarme/subscription-card-payload';
import type { PagarmeBillingAddressInput } from '@/lib/pagarme/subscription-checkout';

type PagarmeSubscriptionResponse = {
  id: string;
  status?: string;
  next_billing_at?: string;
};

export async function attachPagarmeSubscriptionToExisting(input: {
  supabase: SupabaseClient;
  subscriptionId: string;
  userId: string;
  planSlug: PlanSlug;
  planName: string;
  priceCents: number;
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
}) {
  const pagarmeCustomerId = await getOrCreatePagarmeCustomer(
    input.supabase,
    input.profile,
    input.address
  );

  const pagarmeSubscription = await pagarmeRequest<PagarmeSubscriptionResponse>(
    '/subscriptions',
    {
      method: 'POST',
      body: {
        code: input.subscriptionId,
        payment_method: 'credit_card',
        currency: 'BRL',
        interval: 'month',
        interval_count: 1,
        billing_type: 'prepaid',
        customer_id: pagarmeCustomerId,
        ...buildPagarmeSubscriptionCardPayload({
          cardToken: input.cardToken,
          billingAddress: input.billingAddress,
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
          subscription_id: input.subscriptionId,
          plan_slug: input.planSlug,
          migrated_from: 'asaas',
        },
      },
    }
  );

  const now = new Date().toISOString();

  const { error } = await input.supabase
    .from('subscriptions')
    .update({
      pagarme_subscription_id: pagarmeSubscription.id,
      pagarme_customer_id: pagarmeCustomerId,
      card_last4: input.cardLast4,
      card_brand: input.cardBrand,
      next_billing_date: pagarmeSubscription.next_billing_at ?? null,
      migrated_to_pagarme_at: now,
      updated_at: now,
    })
    .eq('id', input.subscriptionId)
    .eq('user_id', input.userId);

  if (error) {
    throw new Error('Não foi possível vincular a assinatura ao Pagar.me.');
  }

  return {
    pagarmeSubscriptionId: pagarmeSubscription.id,
    pagarmeCustomerId,
  };
}
