import type { SupabaseClient } from '@supabase/supabase-js';
import { asaasRequest } from '@/lib/asaas/client';
import { normalizeAsaasSubscriptionRef } from '@/lib/asaas/refs';
import { findLocalSubscriptionByAsaasId } from '@/lib/asaas/resolve-local-subscription';
import {
  handleAsaasPaymentConfirmed,
  type AsaasWebhookPayment,
} from '@/lib/asaas/webhook-handlers';
import { activateSubscriptionFromAsaas } from '@/lib/subscriptions/activate-asaas';
import { markCyclePreparing } from '@/lib/subscriptions/cycles';
import { notifyPurchaseCompleted } from '@/lib/email/subscription-notify';
import { parseBrazilDateOnlyToIso, resolveGatewayPaidAt } from '@/lib/datetime/brazil';
import { createAdminClient } from '@/lib/supabase/admin';

import { isAsaasPaymentConfirmed } from '@/lib/asaas/payment-status';

type AsaasPaymentListItem = {
  id: string;
  subscription?: string | { id?: string } | null;
  externalReference?: string | null;
  value?: number;
  status?: string;
  billingType?: string;
  paymentDate?: string | null;
};

type PaymentListResponse = {
  data?: AsaasPaymentListItem[];
};

type AsaasSubscriptionResponse = {
  id: string;
  status?: string;
  externalReference?: string | null;
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
    paymentDate: payment.paymentDate ?? undefined,
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
  return findLocalSubscriptionByAsaasId(supabase, asaasSubscriptionId);
}

async function activatePendingFromConfirmedPayment(
  supabase: SupabaseClient,
  local: NonNullable<Awaited<ReturnType<typeof findLocalByAsaasId>>>,
  confirmed: AsaasPaymentListItem
): Promise<boolean> {
  const amountCents = Math.round((confirmed.value ?? 0) * 100);
  const now = new Date().toISOString();
  const paidAt = resolveGatewayPaidAt(
    null,
    confirmed.paymentDate?.trim()
      ? parseBrazilDateOnlyToIso(confirmed.paymentDate.trim())
      : null,
    now
  );

  const { data: paymentRow } = await supabase
    .from('payments')
    .upsert(
      {
        user_id: local.user_id,
        subscription_id: local.id,
        asaas_payment_id: confirmed.id,
        amount_cents: amountCents,
        currency: 'BRL',
        status: 'approved',
        paid_at: paidAt,
      },
      { onConflict: 'asaas_payment_id' }
    )
    .select('id, amount_cents')
    .single();

  const activated = await activateSubscriptionFromAsaas(supabase, local.id);
  if (!activated) {
    return false;
  }

  if (paymentRow) {
    await markCyclePreparing(supabase, local.id, 1, {
      id: paymentRow.id,
      amount_cents: paymentRow.amount_cents,
      paid_at: paidAt,
    });
  }

  void notifyPurchaseCompleted(supabase, local.id, amountCents, 1).catch(
    (err) => {
      console.error('[email] purchase completed notify failed:', err);
    }
  );

  return true;
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
    const result = await handleAsaasPaymentConfirmed(
      supabase,
      toAsaasWebhookPayment(confirmed)
    );
    if (result === 'processed') {
      return true;
    }

    return activatePendingFromConfirmedPayment(supabase, local, confirmed);
  }

  const latest = payments[0];
  const amountCents = Math.round((latest?.value ?? 0) * 100);

  const activated = await activateSubscriptionFromAsaas(supabase, local.id);
  if (!activated) {
    return false;
  }

  if (latest?.id) {
    const paidAt = isAsaasPaymentConfirmed(latest.status)
      ? resolveGatewayPaidAt(
          null,
          latest.paymentDate?.trim()
            ? parseBrazilDateOnlyToIso(latest.paymentDate.trim())
            : null,
          new Date().toISOString()
        )
      : null;
    const { data: paymentRow } = await supabase
      .from('payments')
      .upsert(
        {
          user_id: local.user_id,
          subscription_id: local.id,
          asaas_payment_id: latest.id,
          amount_cents: amountCents,
          currency: 'BRL',
          status: isAsaasPaymentConfirmed(latest.status) ? 'approved' : 'pending',
          paid_at: paidAt,
        },
        { onConflict: 'asaas_payment_id' }
      )
      .select('id, amount_cents')
      .single();

    if (paymentRow && paidAt) {
      await markCyclePreparing(supabase, local.id, 1, {
        id: paymentRow.id,
        amount_cents: paymentRow.amount_cents,
        paid_at: paidAt,
      });
    }
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
        if (result === 'processed') {
          return true;
        }

        const local = await findLocalByAsaasId(supabase, asaasSubscriptionId);
        if (
          local?.status === 'pending' &&
          (await activatePendingFromConfirmedPayment(
            supabase,
            local,
            confirmed
          ))
        ) {
          return true;
        }
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
