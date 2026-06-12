import { asaasRequest } from '@/lib/asaas/client';

type AsaasSubscriptionDeleteResponse = {
  deleted: boolean;
  id: string;
};

export async function cancelAsaasSubscriptionBestEffort(
  asaasSubscriptionId: string
) {
  try {
    await asaasRequest<AsaasSubscriptionDeleteResponse>(
      `/subscriptions/${asaasSubscriptionId}`,
      { method: 'DELETE' }
    );
  } catch (error) {
    console.warn(
      '[asaas] could not cancel subscription:',
      asaasSubscriptionId,
      error
    );
  }
}
