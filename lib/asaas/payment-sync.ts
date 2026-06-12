import { asaasRequest } from '@/lib/asaas/client';
import { normalizeAsaasSubscriptionRef } from '@/lib/asaas/refs';
import {
  handleAsaasPaymentConfirmed,
  type AsaasWebhookPayment,
} from '@/lib/asaas/webhook-handlers';
import { createAdminClient } from '@/lib/supabase/admin';

const CONFIRMED_STATUSES = new Set(['CONFIRMED', 'RECEIVED']);

type AsaasPaymentListItem = {
  id: string;
  subscription?: string | { id?: string } | null;
  externalReference?: string | null;
  value?: number;
  status?: string;
  billingType?: string;
};

type PaymentListResponse = {
  data?: AsaasPaymentListItem[];
};

export function toAsaasWebhookPayment(
  payment: AsaasPaymentListItem
): AsaasWebhookPayment {
  return {
    id: payment.id,
    subscription: normalizeAsaasSubscriptionRef(payment.subscription) ?? undefined,
    externalReference: payment.externalReference ?? undefined,
    value: payment.value,
    status: payment.status,
    billingType: payment.billingType,
  };
}

export async function listAsaasSubscriptionPayments(
  asaasSubscriptionId: string
): Promise<AsaasPaymentListItem[]> {
  const response = await asaasRequest<PaymentListResponse>(
    `/subscriptions/${asaasSubscriptionId}/payments?limit=20`
  );
  return response.data ?? [];
}

/** Consulta cobranças no Asaas e ativa a assinatura local se já houver pagamento confirmado. */
export async function syncAsaasSubscriptionPayments(
  asaasSubscriptionId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const payments = await listAsaasSubscriptionPayments(asaasSubscriptionId);
      const confirmed = payments.find(
        (payment) => payment.status && CONFIRMED_STATUSES.has(payment.status)
      );

      if (confirmed) {
        const result = await handleAsaasPaymentConfirmed(
          supabase,
          toAsaasWebhookPayment(confirmed)
        );
        return result === 'processed';
      }
    } catch (error) {
      console.error('[asaas] sync payments attempt', attempt + 1, error);
    }

    if (attempt < 4) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  return false;
}

export async function reconcilePendingAsaasSubscription(subscription: {
  status: string;
  asaas_subscription_id?: string | null;
}): Promise<void> {
  if (subscription.status !== 'pending' || !subscription.asaas_subscription_id) {
    return;
  }

  try {
    await syncAsaasSubscriptionPayments(subscription.asaas_subscription_id);
  } catch (error) {
    console.error('[asaas] reconcile pending subscription:', error);
  }
}
