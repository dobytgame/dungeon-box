import { pagarmeRequest } from '@/lib/pagarme/client';
import type { PagarmeBillingAddressInput } from '@/lib/pagarme/subscription-checkout';

export type PagarmeCustomerCard = {
  id: string;
  first_six_digits?: string;
  last_four_digits?: string;
  brand?: string;
  status?: string;
};

/**
 * Persiste o cartão na carteira do cliente a partir de um token de uso único.
 * Depois disso, use `card_id` em pedidos/assinaturas (o token não pode ser reutilizado).
 */
export async function createPagarmeCustomerCard(input: {
  customerId: string;
  cardToken: string;
  billingAddress: PagarmeBillingAddressInput;
}): Promise<PagarmeCustomerCard> {
  const card = await pagarmeRequest<PagarmeCustomerCard>(
    `/customers/${encodeURIComponent(input.customerId)}/cards`,
    {
      method: 'POST',
      body: {
        token: input.cardToken,
        billing_address: {
          ...input.billingAddress,
          country: input.billingAddress.country ?? 'BR',
        },
      },
    }
  );

  if (!card.id?.trim()) {
    throw new Error('Não foi possível salvar o cartão no Pagar.me.');
  }

  return card;
}
