import type { SupabaseClient } from '@supabase/supabase-js';
import { asaasRequest } from '@/lib/asaas/client';
import {
  isAsaasPaymentPending,
  type AsaasPaymentDetails,
} from '@/lib/asaas/payment-details';
import { listAsaasSubscriptionPayments } from '@/lib/asaas/payment-sync';
import {
  resolveSubscriptionRecurringCharge,
  type PlanChargeRow,
  type SubscriptionRecurringContext,
} from '@/lib/subscriptions/recurring-charge';
import { createAdminClient } from '@/lib/supabase/admin';

function centsToReais(cents: number): number {
  return Math.round(cents) / 100;
}

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

type SubscriptionBillingRow = SubscriptionRecurringContext & {
  id: string;
  status: string;
  asaas_subscription_id: string | null;
  pending_plan_id: string | null;
  plans: PlanChargeRow | PlanChargeRow[] | null;
  pending_plan?: PlanChargeRow | PlanChargeRow[] | null;
};

async function loadSubscriptionBillingRow(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<SubscriptionBillingRow | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      `id, status, asaas_subscription_id, pending_plan_id, promo_code, shipping_cents, special_notes,
      plans!plan_id(slug, name, price_cents),
      pending_plan:plans!pending_plan_id(slug, name, price_cents)`
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (error) {
    console.error('[asaas] load subscription billing row:', error);
    return null;
  }

  return data as SubscriptionBillingRow | null;
}

function effectiveBillingPlan(
  subscription: SubscriptionBillingRow
): PlanChargeRow | null {
  if (subscription.pending_plan_id) {
    return relOne(subscription.pending_plan ?? null);
  }
  return relOne(subscription.plans);
}

async function updatePendingAsaasPayment(
  paymentId: string,
  input: { valueCents: number; description?: string }
): Promise<boolean> {
  const body: Record<string, unknown> = {
    value: centsToReais(input.valueCents),
  };

  if (input.description) {
    body.description = input.description;
  }

  await asaasRequest<AsaasPaymentDetails>(`/payments/${paymentId}`, {
    method: 'PUT',
    body,
  });

  return true;
}

/**
 * Ajusta cobrança pendente no Asaas para o valor recorrente esperado.
 * Necessário porque assinaturas de cartão com faturas pagas não permitem alterar o valor da assinatura.
 */
export async function reconcileAsaasSubscriptionPendingPayment(
  supabase: SupabaseClient,
  subscriptionId: string,
  paymentId?: string | null
): Promise<'updated' | 'skipped' | 'failed'> {
  const subscription = await loadSubscriptionBillingRow(supabase, subscriptionId);
  if (!subscription?.asaas_subscription_id || subscription.status !== 'active') {
    return 'skipped';
  }

  const plan = effectiveBillingPlan(subscription);
  if (!plan) return 'skipped';

  const admin = createAdminClient();
  const charge = await resolveSubscriptionRecurringCharge(admin, plan, subscription);
  const expectedCents = charge.totalCents;

  try {
    if (paymentId) {
      const payment = await asaasRequest<AsaasPaymentDetails>(
        `/payments/${paymentId}`
      );
      if (!isAsaasPaymentPending(payment.status)) {
        return 'skipped';
      }

      const currentCents = Math.round((payment.value ?? 0) * 100);
      if (currentCents === expectedCents) {
        return 'skipped';
      }

      await updatePendingAsaasPayment(paymentId, {
        valueCents: expectedCents,
        description: charge.description,
      });
      return 'updated';
    }

    const payments = await listAsaasSubscriptionPayments(
      subscription.asaas_subscription_id
    );
    const pending = payments.find((payment) =>
      isAsaasPaymentPending(payment.status)
    );
    if (!pending?.id) return 'skipped';

    const currentCents = Math.round((pending.value ?? 0) * 100);
    if (currentCents === expectedCents) {
      return 'skipped';
    }

    await updatePendingAsaasPayment(pending.id, {
      valueCents: expectedCents,
      description: charge.description,
    });
    return 'updated';
  } catch (error) {
    console.warn('[asaas] reconcile pending subscription payment:', error);
    return 'failed';
  }
}
