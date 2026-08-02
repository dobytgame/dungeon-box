export type PagarmeBillingAddressInput = {
  line_1: string;
  line_2?: string;
  zip_code: string;
  city: string;
  state: string;
  country?: string;
};

export type PagarmeSubscriptionCardInput = {
  cardId?: string | null;
  cardToken?: string | null;
  billingAddress: PagarmeBillingAddressInput;
};

/**
 * Payload canônico para POST/PATCH de assinatura no Pagar.me Core v5.
 *
 * IMPORTANTE (produção):
 * - `card_id` e `card_token` DEVEM ir no topo do body.
 * - Aninhá-los em `card` faz a API validar como cartão cru e retornar 422
 *   ("The card number is required", "exp_month must be between 1 and 12").
 * - Com token, envie também `card.billing_address` (mesmo padrão dos orders).
 */
export function buildPagarmeSubscriptionCardPayload(
  input: PagarmeSubscriptionCardInput
): Record<string, unknown> {
  const billingAddress = {
    ...input.billingAddress,
    country: input.billingAddress.country ?? 'BR',
  };

  const cardId = input.cardId?.trim() || null;
  if (cardId) {
    return { card_id: cardId };
  }

  const cardToken = input.cardToken?.trim() || null;
  if (!cardToken) {
    throw new Error('Informe card_id ou card_token para a assinatura Pagar.me.');
  }

  return {
    card_token: cardToken,
    card: {
      billing_address: billingAddress,
    },
  };
}
