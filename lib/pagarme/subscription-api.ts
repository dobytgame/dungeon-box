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
    cardToken: string;
    billingAddress: {
      line_1: string;
      line_2?: string;
      zip_code: string;
      city: string;
      state: string;
      country?: string;
    };
  }
) {
  return pagarmeRequest<PagarmeSubscriptionResponse>(
    `/subscriptions/${encodeURIComponent(pagarmeSubscriptionId)}/card`,
    {
      method: 'PATCH',
      body: buildPagarmeSubscriptionCardPayload({
        cardToken: input.cardToken,
        billingAddress: input.billingAddress,
      }),
    }
  );
}
