import { asaasRequest } from '@/lib/asaas/client';
import type {
  AsaasCreditCardHolderInput,
  AsaasCreditCardInput,
} from '@/lib/asaas/subscription-checkout';

type AsaasSubscriptionResponse = {
  id: string;
  status?: string;
};

export async function updateAsaasSubscriptionCreditCard(
  asaasSubscriptionId: string,
  input: {
    creditCard: AsaasCreditCardInput;
    creditCardHolderInfo: AsaasCreditCardHolderInput;
    remoteIp: string;
  }
) {
  return asaasRequest<AsaasSubscriptionResponse>(
    `/subscriptions/${asaasSubscriptionId}/creditCard`,
    {
      method: 'PUT',
      body: {
        creditCard: input.creditCard,
        creditCardHolderInfo: input.creditCardHolderInfo,
        remoteIp: input.remoteIp,
      },
    }
  );
}
