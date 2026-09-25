import { pagarmeRequest } from '@/lib/pagarme/client';
import { buildPagarmeSubscriptionCardPayload } from '@/lib/pagarme/subscription-card-payload';

type PagarmeSubscriptionResponse = {
  id: string;
  status?: string;
};

export async function cancelPagarmeSubscriptionBestEffort(
  pagarmeSubscriptionId: string
) {
  try {
    await pagarmeRequest<PagarmeSubscriptionResponse>(
      `/subscriptions/${pagarmeSubscriptionId}`,
      { method: 'DELETE' }
    );
  } catch (error) {
    console.warn(
      '[pagarme] could not cancel subscription:',
      pagarmeSubscriptionId,
      error
    );
  }
}

export async function fetchPagarmeSubscription(pagarmeSubscriptionId: string) {
  return pagarmeRequest<PagarmeSubscriptionResponse>(
    `/subscriptions/${pagarmeSubscriptionId}`
  );
}

export async function updatePagarmeSubscriptionCard(
  pagarmeSubscriptionId: string,
  input: {
    cardId?: string | null;
    cardToken?: string | null;
    billingAddress?: {
      line_1: string;
      line_2?: string;
      zip_code: string;
      city: string;
      state: string;
      country?: string;
    };
  }
) {
  const cardId = input.cardId?.trim() || null;
  const cardToken = input.cardToken?.trim() || null;

  if (!cardId && !cardToken) {
    throw new Error('Informe card_id ou card_token para a assinatura Pagar.me.');
  }

  if (!cardId && !input.billingAddress) {
    throw new Error('billingAddress é obrigatório com card_token.');
  }

  return pagarmeRequest<PagarmeSubscriptionResponse>(
    `/subscriptions/${encodeURIComponent(pagarmeSubscriptionId)}/card`,
    {
      method: 'PATCH',
      body: buildPagarmeSubscriptionCardPayload({
        cardId,
        cardToken,
        billingAddress: input.billingAddress ?? {
          line_1: '-',
          zip_code: '00000000',
          city: '-',
          state: 'SP',
        },
      }),
    }
  );
}
