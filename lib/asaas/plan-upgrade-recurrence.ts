import type { SupabaseClient } from '@supabase/supabase-js';
import { ASAAS_CONFIGURED, asaasRequest } from '@/lib/asaas/client';
import { fetchAsaasPaymentDetails } from '@/lib/asaas/payment-details';
import { isAsaasPaymentConfirmed } from '@/lib/asaas/payment-status';
import { listAsaasSubscriptionPayments } from '@/lib/asaas/payment-sync';
import { cancelAsaasSubscriptionBestEffort } from '@/lib/asaas/subscription-api';
import { isComboTerm, type BillingTerm } from '@/lib/checkout/combo-billing';
import {
  resolveSubscriptionRecurringCharge,
  type PlanChargeRow,
  type SubscriptionRecurringContext,
} from '@/lib/subscriptions/recurring-charge';
import { createAdminClient } from '@/lib/supabase/admin';

const DEFAULT_REMOTE_IP =
  process.env.ASAAS_DEFAULT_REMOTE_IP?.trim() || '127.0.0.1';

type AsaasSubscriptionDetails = {
  id: string;
  customer: string;
  value?: number;
  nextDueDate?: string | null;
  description?: string | null;
  status?: string;
  creditCard?: {
    creditCardToken?: string | null;
  } | null;
};

type AsaasSubscriptionCreateResponse = {
  id: string;
};

type SubscriptionBillingRow = SubscriptionRecurringContext & {
  id: string;
  status: string;
  billing_term: string | null;
  is_partner: boolean | null;
  asaas_subscription_id: string | null;
  asaas_customer_id: string | null;
  pending_plan_id: string | null;
  next_billing_date: string | null;
  plans: PlanChargeRow | PlanChargeRow[] | null;
  pending_plan?: PlanChargeRow | PlanChargeRow[] | null;
};

export type RecreateAsaasSubscriptionBillingResult =
  | {
      status: 'recreated';
      previousAsaasSubscriptionId: string;
      newAsaasSubscriptionId: string;
    }
  | { status: 'already_aligned'; asaasSubscriptionId: string }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; reason: string };

export type RepairAllPlanUpgradeAsaasRecurrencesResult = {
  scanned: number;
  recreated: number;
  alreadyAligned: number;
  skipped: number;
  failed: Array<{ subscriptionId: string; reason: string }>;
};

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function centsToReais(cents: number): number {
  return Math.round(cents) / 100;
}

function remoteValueCents(value?: number | null): number {
  return Math.round((value ?? 0) * 100);
}

function formatAsaasDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function resolveNextDueDate(
  subscription: SubscriptionBillingRow,
  remoteNextDueDate?: string | null
): string {
  if (subscription.next_billing_date) {
    const parsed = new Date(subscription.next_billing_date);
    if (!Number.isNaN(parsed.getTime())) {
      return formatAsaasDate(parsed);
    }
  }

  if (remoteNextDueDate) {
    const parsed = new Date(remoteNextDueDate);
    if (!Number.isNaN(parsed.getTime())) {
      return formatAsaasDate(parsed);
    }
  }

  const fallback = new Date();
  fallback.setMonth(fallback.getMonth() + 1);
  return formatAsaasDate(fallback);
}

async function loadSubscriptionBillingRow(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<SubscriptionBillingRow | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      `id, status, billing_term, is_partner, asaas_subscription_id, asaas_customer_id,
      pending_plan_id, next_billing_date, promo_code, shipping_cents, special_notes,
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

async function fetchAsaasSubscriptionDetails(
  asaasSubscriptionId: string
): Promise<AsaasSubscriptionDetails> {
  return asaasRequest<AsaasSubscriptionDetails>(
    `/subscriptions/${asaasSubscriptionId}`
  );
}

async function resolveCreditCardToken(
  remote: AsaasSubscriptionDetails,
  asaasSubscriptionId: string
): Promise<string | null> {
  const fromSubscription = remote.creditCard?.creditCardToken?.trim();
  if (fromSubscription) return fromSubscription;

  const payments = await listAsaasSubscriptionPayments(asaasSubscriptionId);
  for (const payment of payments) {
    if (!payment.id || !isAsaasPaymentConfirmed(payment.status)) continue;

    try {
      const details = await fetchAsaasPaymentDetails(payment.id);
      const token = (
        details as { creditCard?: { creditCardToken?: string | null } }
      ).creditCard?.creditCardToken?.trim();
      if (token) return token;
    } catch {
      continue;
    }
  }

  return null;
}

function billingLooksAligned(
  remote: AsaasSubscriptionDetails,
  expectedCents: number,
  expectedDescription: string
): boolean {
  const currentDescription = remote.description?.trim() ?? '';
  const expected = expectedDescription.trim();
  return (
    remoteValueCents(remote.value) === expectedCents &&
    currentDescription === expected
  );
}

/**
 * Cancela a recorrência atual no Asaas e cria uma nova assinatura com o plano
 * efetivo (pendente de upgrade ou plano atual), preservando o cartão tokenizado.
 */
export async function recreateAsaasSubscriptionForBillingPlan(
  supabase: SupabaseClient,
  subscriptionId: string,
  options?: { remoteIp?: string | null }
): Promise<RecreateAsaasSubscriptionBillingResult> {
  if (!ASAAS_CONFIGURED) {
    return { status: 'skipped', reason: 'asaas_not_configured' };
  }

  const subscription = await loadSubscriptionBillingRow(supabase, subscriptionId);
  if (!subscription) {
    return { status: 'failed', reason: 'subscription_not_found' };
  }

  if (subscription.status !== 'active') {
    return { status: 'skipped', reason: 'subscription_not_active' };
  }

  if (subscription.is_partner) {
    return { status: 'skipped', reason: 'partner_subscription' };
  }

  const billingTerm = (subscription.billing_term ?? 'monthly') as BillingTerm;
  if (isComboTerm(billingTerm)) {
    return { status: 'skipped', reason: 'combo_subscription' };
  }

  if (!subscription.asaas_subscription_id || !subscription.asaas_customer_id) {
    return { status: 'skipped', reason: 'missing_asaas_link' };
  }

  const plan = await resolveEffectiveBillingPlan(supabase, subscription);
  if (!plan) {
    return { status: 'failed', reason: 'billing_plan_not_found' };
  }

  const admin = createAdminClient();
  const charge = await resolveSubscriptionRecurringCharge(admin, plan, subscription);
  const previousAsaasSubscriptionId = subscription.asaas_subscription_id;

  let remote: AsaasSubscriptionDetails;
  try {
    remote = await fetchAsaasSubscriptionDetails(previousAsaasSubscriptionId);
  } catch (error) {
    console.warn('[asaas] fetch subscription before recreate:', error);
    return { status: 'failed', reason: 'asaas_subscription_fetch_failed' };
  }

  if (
    billingLooksAligned(remote, charge.totalCents, charge.description) &&
    remote.status !== 'INACTIVE'
  ) {
    return {
      status: 'already_aligned',
      asaasSubscriptionId: previousAsaasSubscriptionId,
    };
  }

  const creditCardToken = await resolveCreditCardToken(
    remote,
    previousAsaasSubscriptionId
  );
  if (!creditCardToken) {
    return { status: 'failed', reason: 'credit_card_token_unavailable' };
  }

  const nextDueDate = resolveNextDueDate(subscription, remote.nextDueDate);
  const remoteIp = options?.remoteIp?.trim() || DEFAULT_REMOTE_IP;

  await cancelAsaasSubscriptionBestEffort(previousAsaasSubscriptionId);

  let created: AsaasSubscriptionCreateResponse;
  try {
    created = await asaasRequest<AsaasSubscriptionCreateResponse>(
      '/subscriptions/',
      {
        method: 'POST',
        body: {
          customer: subscription.asaas_customer_id,
          billingType: 'CREDIT_CARD',
          cycle: 'MONTHLY',
          value: centsToReais(charge.totalCents),
          nextDueDate,
          description: charge.description,
          externalReference: subscriptionId,
          creditCardToken,
          remoteIp,
        },
      }
    );
  } catch (error) {
    console.error('[asaas] recreate subscription after plan upgrade:', error);
    return { status: 'failed', reason: 'asaas_subscription_create_failed' };
  }

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      asaas_subscription_id: created.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId);

  if (updateError) {
    await cancelAsaasSubscriptionBestEffort(created.id);
    return { status: 'failed', reason: 'local_subscription_link_failed' };
  }

  return {
    status: 'recreated',
    previousAsaasSubscriptionId,
    newAsaasSubscriptionId: created.id,
  };
}

export async function repairAllPlanUpgradeAsaasRecurrences(
  admin: SupabaseClient
): Promise<RepairAllPlanUpgradeAsaasRecurrencesResult> {
  const { data, error } = await admin
    .from('subscriptions')
    .select('id, billing_term, status, is_partner, asaas_subscription_id')
    .eq('status', 'active')
    .eq('is_partner', false)
    .not('asaas_subscription_id', 'is', null);

  if (error) {
    console.error('[asaas] repair all plan upgrade recurrences:', error);
    return {
      scanned: 0,
      recreated: 0,
      alreadyAligned: 0,
      skipped: 0,
      failed: [{ subscriptionId: '*', reason: error.message }],
    };
  }

  const result: RepairAllPlanUpgradeAsaasRecurrencesResult = {
    scanned: 0,
    recreated: 0,
    alreadyAligned: 0,
    skipped: 0,
    failed: [],
  };

  for (const row of data ?? []) {
    if (isComboTerm((row.billing_term ?? 'monthly') as BillingTerm)) continue;

    result.scanned += 1;
    const repair = await recreateAsaasSubscriptionForBillingPlan(
      admin,
      row.id as string
    );

    switch (repair.status) {
      case 'recreated':
        result.recreated += 1;
        break;
      case 'already_aligned':
        result.alreadyAligned += 1;
        break;
      case 'skipped':
        result.skipped += 1;
        break;
      case 'failed':
        result.failed.push({
          subscriptionId: row.id as string,
          reason: repair.reason,
        });
        break;
    }
  }

  return result;
}
