import { pagarmeRequest } from '@/lib/pagarme/client';
import type { PagarmeBillingAddressInput } from '@/lib/pagarme/subscription-checkout';

export type PagarmeCustomerCard = {
  id: string;
  first_six_digits?: string;
  last_four_digits?: string;
  brand?: string;
  status?: string;
  created_at?: string;
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

export async function listPagarmeCustomerCards(
  customerId: string
): Promise<PagarmeCustomerCard[]> {
  const response = await pagarmeRequest<{ data?: PagarmeCustomerCard[] }>(
    `/customers/${encodeURIComponent(customerId)}/cards`
  );
  return response.data ?? [];
}

/** Fallback: último cartão ativo do cliente (útil após cobrança com token). */
export async function resolveLatestPagarmeCustomerCardId(
  customerId: string
): Promise<string | null> {
  try {
    const cards = await listPagarmeCustomerCards(customerId);
    const active = cards.filter(
      (card) => (card.status ?? 'active').toLowerCase() === 'active' && card.id
    );
    if (active.length === 0) return null;
    active.sort((a, b) =>
      String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
    );
    return active[0]?.id ?? null;
  } catch {
    return null;
  }
}
