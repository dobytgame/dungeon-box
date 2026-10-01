import { asaasRequest } from '@/lib/asaas/client';

type AsaasSubscriptionDeleteResponse = {
  deleted: boolean;
  id: string;
};

type AsaasSubscriptionResponse = {
  id: string;
  status?: string;
};

function centsToReais(cents: number): number {
  return Math.round(cents) / 100;
}

function formatAsaasDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

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

const CANCELLABLE_ASAAS_PAYMENT_STATUSES = new Set(['PENDING', 'OVERDUE']);

/** Inativa a recorrência e remove cobranças ainda não pagas, que o Asaas seguiria tentando. */
export async function pauseAsaasSubscription(asaasSubscriptionId: string) {
  await asaasRequest<AsaasSubscriptionResponse>(
    `/subscriptions/${asaasSubscriptionId}`,
    {
      method: 'PUT',
      body: { status: 'INACTIVE' },
    }
  );

  const listed = await asaasRequest<{
    data?: Array<{ id?: string; status?: string }>;
  }>(`/subscriptions/${asaasSubscriptionId}/payments?limit=50`);

  for (const payment of listed.data ?? []) {
    const status = payment.status?.trim().toUpperCase() ?? '';
    if (!payment.id || !CANCELLABLE_ASAAS_PAYMENT_STATUSES.has(status)) continue;

    await asaasRequest(`/payments/${payment.id}`, { method: 'DELETE' });
  }
}

export async function resumeAsaasSubscription(
  asaasSubscriptionId: string,
  nextDueDate: Date
) {
  await asaasRequest<AsaasSubscriptionResponse>(
    `/subscriptions/${asaasSubscriptionId}`,
    {
      method: 'PUT',
      body: {
        status: 'ACTIVE',
        nextDueDate: formatAsaasDate(nextDueDate),
      },
    }
  );
}

export async function updateAsaasSubscriptionDetails(
  asaasSubscriptionId: string,
  input: {
    valueCents: number;
    description?: string;
    updatePendingPayments?: boolean;
  }
) {
  const body: Record<string, unknown> = {
    value: centsToReais(input.valueCents),
  };

  if (input.description) {
    body.description = input.description;
  }

  if (input.updatePendingPayments) {
    body.updatePendingPayments = true;
  }

  await asaasRequest<AsaasSubscriptionResponse>(
    `/subscriptions/${asaasSubscriptionId}`,
    {
      method: 'PUT',
      body,
    }
  );
}
