import type { SupabaseClient } from '@supabase/supabase-js';
import { asaasRequest } from '@/lib/asaas/client';
import { normalizeAsaasSubscriptionRef } from '@/lib/asaas/refs';
import {
  handleAsaasPaymentConfirmed,
  type AsaasWebhookPayment,
} from '@/lib/asaas/webhook-handlers';
import { activateSubscriptionFromAsaas } from '@/lib/subscriptions/activate-asaas';
import { notifyPurchaseCompleted } from '@/lib/email/subscription-notify';
import { createAdminClient } from '@/lib/supabase/admin';

const CONFIRMED_STATUSES = new Set([
  'CONFIRMED',
  'RECEIVED',
  'RECEIVED_IN_CASH',
  'AUTHORIZED',
]);

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

type AsaasSubscriptionResponse = {
  id: string;
  status?: string;
  externalReference?: string | null;
};

export function isAsaasPaymentConfirmed(status?: string | null): boolean {
  if (!status) return false;
  return CONFIRMED_STATUSES.has(status.toUpperCase());
}

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

async function fetchAsaasSubscription(
  asaasSubscriptionId: string
): Promise<AsaasSubscriptionResponse> {
  return asaasRequest<AsaasSubscriptionResponse>(
    `/subscriptions/${asaasSubscriptionId}`
  );
}

async function findLocalByAsaasId(
  supabase: SupabaseClient,
  asaasSubscriptionId: string
) {
  const { data } = await supabase
    .from('subscriptions')
    .select('id, status, user_id, current_cycle, asaas_subscription_id')
    .eq('asaas_subscription_id', asaasSubscriptionId)
    .maybeSingle();

  return data;
}

async function activatePendingFromActiveAsaasSubscription(
  supabase: SupabaseClient,
  asaasSubscriptionId: string
): Promise<boolean> {
  const remote = await fetchAsaasSubscription(asaasSubscriptionId);
  if (remote.status?.toUpperCase() !== 'ACTIVE') {
    return false;
  }

  const local = await findLocalByAsaasId(supabase, asaasSubscriptionId);
  if (!local) return false;
  if (local.status === 'active') return true;
  if (local.status !== 'pending') return false;

  const payments = await listAsaasSubscriptionPayments(asaasSubscriptionId);
  const confirmed = payments.find((payment) =>
    isAsaasPaymentConfirmed(payment.status)
  );

  if (confirmed) {
    return (
      (await handleAsaasPaymentConfirmed(
        supabase,
        toAsaasWebhookPayment(confirmed)
      )) === 'processed'
    );
  }

  const latest = payments[0];
  const amountCents = Math.round((latest?.value ?? 0) * 100);

  await activateSubscriptionFromAsaas(supabase, local.id);

  if (latest?.id) {
    await supabase.from('payments').upsert(
      {
        user_id: local.user_id,
        subscription_id: local.id,
        asaas_payment_id: latest.id,
        amount_cents: amountCents,
        currency: 'BRL',
        status: isAsaasPaymentConfirmed(latest.status) ? 'approved' : 'pending',
        paid_at: isAsaasPaymentConfirmed(latest.status)
          ? new Date().toISOString()
          : null,
      },
      { onConflict: 'asaas_payment_id' }
    );
  }

  void notifyPurchaseCompleted(supabase, local.id, amountCents, 1).catch(
    (err) => {
      console.error('[email] purchase completed notify failed:', err);
    }
  );

  return true;
}

/** Consulta cobranças no Asaas e ativa a assinatura local se já houver pagamento confirmado. */
export async function syncAsaasSubscriptionPayments(
  asaasSubscriptionId: string
): Promise<boolean> {
  const supabase = createAdminClient();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const payments = await listAsaasSubscriptionPayments(asaasSubscriptionId);
      const confirmed = payments.find((payment) =>
        isAsaasPaymentConfirmed(payment.status)
      );

      if (confirmed) {
        const result = await handleAsaasPaymentConfirmed(
          supabase,
          toAsaasWebhookPayment(confirmed)
        );
        if (result === 'processed') return true;
      }

      if (await activatePendingFromActiveAsaasSubscription(supabase, asaasSubscriptionId)) {
        return true;
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
