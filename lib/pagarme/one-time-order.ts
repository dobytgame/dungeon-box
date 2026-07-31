import { pagarmeRequest } from '@/lib/pagarme/client';

type PagarmeOrderResponse = {
  id: string;
  status?: string;
  charges?: Array<{ id?: string; status?: string }>;
};

export async function chargePagarmeOneTimeOrder(input: {
  customerId: string;
  valueCents: number;
  description: string;
  cardToken: string;
  billingAddress: {
    line_1: string;
    line_2?: string;
    zip_code: string;
    city: string;
    state: string;
    country?: string;
  };
  externalReference?: string;
}) {
  return pagarmeRequest<PagarmeOrderResponse>('/orders', {
    method: 'POST',
    body: {
      customer_id: input.customerId,
      code: input.externalReference,
      items: [
        {
          amount: input.valueCents,
          description: input.description,
          quantity: 1,
          code: input.externalReference ?? 'one-time',
        },
      ],
      payments: [
        {
          payment_method: 'credit_card',
          credit_card: {
            card_token: input.cardToken,
            billing_address: {
              ...input.billingAddress,
              country: input.billingAddress.country ?? 'BR',
            },
          },
        },
      ],
    },
  });
}
