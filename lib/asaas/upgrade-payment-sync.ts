import type { SupabaseClient } from '@supabase/supabase-js';
import { asaasRequest } from '@/lib/asaas/client';
import {
  isAsaasPaymentPending,
  type AsaasPaymentDetails,
} from '@/lib/asaas/payment-details';
import { listAsaasSubscriptionPayments } from '@/lib/asaas/payment-sync';
import { updateAsaasSubscriptionDetails } from '@/lib/asaas/subscription-api';
import {
  resolveSubscriptionRecurringCharge,
  type PlanChargeRow,
  type RecurringChargeBreakdown,
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

async function resolveEffectiveBillingPlan(
  supabase: SupabaseClient,
  subscription: SubscriptionBillingRow
): Promise<PlanChargeRow | null> {
  if (subscription.pending_plan_id) {
    const pendingPlan = relOne(subscription.pending_plan ?? null);
    if (pendingPlan) return pendingPlan;

    const { data: plan } = await supabase
      .from('plans')
      .select('slug, name, price_cents')
      .eq('id', subscription.pending_plan_id)
      .maybeSingle();

    return plan ?? null;
  }

  return relOne(subscription.plans);
}

async function updatePendingAsaasPayment(
  paymentId: string,
  input: { valueCents: number; description?: string }
): Promise<void> {
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
}

async function tryUpdateAsaasSubscriptionRecurringValue(
  asaasSubscriptionId: string,
  charge: RecurringChargeBreakdown
): Promise<boolean> {
  try {
    await updateAsaasSubscriptionDetails(asaasSubscriptionId, {
      valueCents: charge.totalCents,
      description: charge.description,
    });
    return true;
  } catch (error) {
    console.warn('[asaas] subscription recurring value update skipped:', error);
    return false;
  }
}

function paymentNeedsReconcile(
  payment: { value?: number; description?: string | null },
  charge: RecurringChargeBreakdown
): boolean {
  const currentCents = Math.round((payment.value ?? 0) * 100);
  if (currentCents !== charge.totalCents) return true;

  const currentDescription = payment.description?.trim() ?? '';
  const expectedDescription = charge.description.trim();
  return currentDescription !== expectedDescription;
}

/**
 * Alinha valor e descrição da assinatura/cobrança pendente no Asaas com o plano efetivo
 * (plano pendente de upgrade ou plano atual).
 *
 * Assinaturas de cartão com faturas pagas podem bloquear alteração do valor da assinatura;
 * nesses casos ajustamos cada cobrança pendente individualmente.
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

  const plan = await resolveEffectiveBillingPlan(supabase, subscription);
  if (!plan) return 'skipped';

  const admin = createAdminClient();
  const charge = await resolveSubscriptionRecurringCharge(admin, plan, subscription);

  let updated = false;
  let pendingUpdateFailed = false;

  try {
    if (await tryUpdateAsaasSubscriptionRecurringValue(
      subscription.asaas_subscription_id,
      charge
    )) {
      updated = true;
    }

    if (paymentId) {
      const payment = await asaasRequest<AsaasPaymentDetails>(
        `/payments/${paymentId}`
      );
      if (!isAsaasPaymentPending(payment.status)) {
        return updated ? 'updated' : 'skipped';
      }

      if (!paymentNeedsReconcile(payment, charge)) {
        return updated ? 'updated' : 'skipped';
      }

      await updatePendingAsaasPayment(paymentId, {
        valueCents: charge.totalCents,
        description: charge.description,
      });
      return 'updated';
    }

    const payments = await listAsaasSubscriptionPayments(
      subscription.asaas_subscription_id
    );
    const pendingPayments = payments.filter((payment) =>
      isAsaasPaymentPending(payment.status)
    );

    if (pendingPayments.length === 0) {
      return updated ? 'updated' : 'skipped';
    }

    for (const pending of pendingPayments) {
      if (!pending.id || !paymentNeedsReconcile(pending, charge)) continue;

      try {
        await updatePendingAsaasPayment(pending.id, {
          valueCents: charge.totalCents,
          description: charge.description,
        });
        updated = true;
      } catch (error) {
        pendingUpdateFailed = true;
        console.warn('[asaas] reconcile pending subscription payment:', {
          subscriptionId,
          paymentId: pending.id,
          error,
        });
      }
    }

    if (pendingUpdateFailed && !updated) {
      return 'failed';
    }

    return updated ? 'updated' : 'skipped';
  } catch (error) {
    console.warn('[asaas] reconcile pending subscription payment:', error);
    return 'failed';
  }
}
