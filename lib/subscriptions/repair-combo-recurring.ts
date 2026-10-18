import type { SupabaseClient } from '@supabase/supabase-js';
import { pauseAsaasSubscription } from '@/lib/asaas/subscription-api';
import { ASAAS_CONFIGURED } from '@/lib/asaas/client';
import {
  isComboTerm,
  prepaidMonthsForTerm,
  type BillingTerm,
} from '@/lib/checkout/combo-billing';
import { PAGARME_CONFIGURED } from '@/lib/pagarme/client';
import { pausePagarmeSubscriptionBilling } from '@/lib/pagarme/subscription-api';
import {
  findCanonicalComboPrepaidPayment,
} from '@/lib/payments/combo-payment-queries';
import {
  parseComboPaymentDetail,
  resolveEffectivePaymentAmountCents,
} from '@/lib/payments/effective-amount';
import {
  syncAsaasSubscriptionComboRecurring,
  syncPagarmeSubscriptionComboRecurring,
  syncPagarmeSubscriptionMonthlyRecurring,
} from '@/lib/subscriptions/combo-recurring-gateway';
import {
  resolveSubscriptionRecurringCharge,
  type PlanChargeRow,
} from '@/lib/subscriptions/recurring-charge';
const ELIGIBLE_STATUSES = new Set(['active', 'past_due', 'paused']);

type ComboSubscriptionRow = {
  id: string;
  status: string;
  billing_term: string | null;
  prepaid_until: string | null;
  next_billing_date: string | null;
  combo_total_cents: number | null;
  combo_auto_renew: boolean | null;
  pending_billing_term: string | null;
  pagarme_subscription_id: string | null;
  pagarme_customer_id: string | null;
  asaas_subscription_id: string | null;
  asaas_customer_id: string | null;
  promo_code: string | null;
  shipping_cents: number | null;
  special_notes: string | null;
  plans?: PlanChargeRow | PlanChargeRow[] | null;
};

export type RepairComboRecurringItemResult = {
  subscriptionId: string;
  outcome: 'synced' | 'skipped' | 'failed';
  reason?: string;
  gateway?: 'pagarme' | 'asaas' | 'none';
};

export type RepairComboRecurringBatchResult = {
  scanned: number;
  synced: number;
  skipped: number;
  failed: number;
  backfilledComboTotal: number;
  items: RepairComboRecurringItemResult[];
};

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function addMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate())
  );
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Próxima cobrança de combo: fim do pré-pago vigente ou next_billing_date futura. */
export function resolveNextComboBillingAt(row: {
  prepaid_until: string | null;
  next_billing_date: string | null;
  billing_term: string | null;
}): Date {
  const now = new Date();
  const prepaid = parseDate(row.prepaid_until);
  const nextBilling = parseDate(row.next_billing_date);

  if (prepaid && prepaid.getTime() > now.getTime()) return prepaid;
  if (nextBilling && nextBilling.getTime() > now.getTime()) return nextBilling;
  if (prepaid) return prepaid;

  const term = (row.billing_term as BillingTerm | null) ?? 'monthly';
  const months = isComboTerm(term) ? prepaidMonthsForTerm(term) ?? 3 : 1;
  return addMonths(now, months);
}

export async function resolveComboTotalCentsForSubscription(
  admin: SupabaseClient,
  row: Pick<ComboSubscriptionRow, 'id' | 'combo_total_cents' | 'billing_term'>
): Promise<number | null> {
  if (row.combo_total_cents != null && row.combo_total_cents > 0) {
    return row.combo_total_cents;
  }

  const canonical = await findCanonicalComboPrepaidPayment(admin, row.id);
  if (!canonical) return null;

  const detail = parseComboPaymentDetail(canonical.status_detail);
  if (detail?.combo_total_cents != null && detail.combo_total_cents > 0) {
    return detail.combo_total_cents;
  }

  const effective = resolveEffectivePaymentAmountCents(
    {
      amount_cents: canonical.amount_cents ?? 0,
      status_detail: canonical.status_detail,
    },
    {
      billing_term: row.billing_term,
      combo_total_cents: row.combo_total_cents,
    }
  );

  return effective > 0 ? effective : null;
}

export async function repairComboRecurringSubscription(
  admin: SupabaseClient,
  row: ComboSubscriptionRow,
  options: { dryRun?: boolean } = {}
): Promise<RepairComboRecurringItemResult> {
  const term = (row.billing_term as BillingTerm | null) ?? 'monthly';
  if (!isComboTerm(term)) {
    return {
      subscriptionId: row.id,
      outcome: 'skipped',
      reason: 'not_combo',
    };
  }

  if (!ELIGIBLE_STATUSES.has(row.status)) {
    return {
      subscriptionId: row.id,
      outcome: 'skipped',
      reason: `status_${row.status}`,
    };
  }

  const plan = relOne(row.plans);
  if (!plan?.name) {
    return {
      subscriptionId: row.id,
      outcome: 'failed',
      reason: 'missing_plan',
    };
  }

  const comboTotal = await resolveComboTotalCentsForSubscription(admin, row);
  if (!comboTotal || comboTotal <= 0) {
    return {
      subscriptionId: row.id,
      outcome: 'failed',
      reason: 'missing_combo_total',
    };
  }

  if (!options.dryRun && row.combo_total_cents !== comboTotal) {
    await admin
      .from('subscriptions')
      .update({
        combo_total_cents: comboTotal,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
  }

  const nextBillingAt = resolveNextComboBillingAt(row);
  const autoRenew = row.combo_auto_renew !== false;
  const switchingToMonthly = row.pending_billing_term === 'monthly';

  const pagarmeId = row.pagarme_subscription_id?.trim() || null;
  const asaasId = row.asaas_subscription_id?.trim() || null;

  if (!pagarmeId && !asaasId) {
    return {
      subscriptionId: row.id,
      outcome: 'skipped',
      reason: 'no_gateway_subscription',
      gateway: 'none',
    };
  }

  if (options.dryRun) {
    return {
      subscriptionId: row.id,
      outcome: 'synced',
      reason: 'dry_run',
      gateway: pagarmeId ? 'pagarme' : 'asaas',
    };
  }

  try {
    if (!autoRenew && !switchingToMonthly) {
      if (pagarmeId && PAGARME_CONFIGURED) {
        await pausePagarmeSubscriptionBilling(pagarmeId);
      } else if (asaasId && ASAAS_CONFIGURED) {
        await pauseAsaasSubscription(asaasId);
      }
      return {
        subscriptionId: row.id,
        outcome: 'synced',
        reason: 'auto_renew_off_paused',
        gateway: pagarmeId ? 'pagarme' : 'asaas',
      };
    }

    if (switchingToMonthly) {
      const charge = await resolveSubscriptionRecurringCharge(admin, plan, {
        promo_code: row.promo_code,
        shipping_cents: row.shipping_cents,
        special_notes: row.special_notes,
      });

      if (pagarmeId && PAGARME_CONFIGURED) {
        await syncPagarmeSubscriptionMonthlyRecurring(
          pagarmeId,
          {
            localSubscriptionId: row.id,
            planName: plan.name,
            planSlug: plan.slug ?? null,
            monthlyTotalCents: charge.totalCents,
            nextBillingAt,
            pagarmeCustomerId: row.pagarme_customer_id,
            description: `DungeonBox — ${plan.name} (renovação mensal após combo)`,
          },
          admin
        );
      } else if (asaasId && ASAAS_CONFIGURED) {
        return {
          subscriptionId: row.id,
          outcome: 'skipped',
          reason: 'asaas_monthly_switch_manual',
          gateway: 'asaas',
        };
      }

      return {
        subscriptionId: row.id,
        outcome: 'synced',
        reason: 'pending_monthly',
        gateway: pagarmeId ? 'pagarme' : 'asaas',
      };
    }

    if (pagarmeId && PAGARME_CONFIGURED) {
      const pagarmeResult = await syncPagarmeSubscriptionComboRecurring(
        pagarmeId,
        {
          localSubscriptionId: row.id,
          planName: plan.name,
          planSlug: plan.slug ?? null,
          billingTerm: term,
          comboTotalCents: comboTotal,
          nextBillingAt,
          pagarmeCustomerId: row.pagarme_customer_id,
        },
        admin
      );
      return {
        subscriptionId: row.id,
        outcome: 'synced',
        reason: pagarmeResult.status,
        gateway: 'pagarme',
      };
    }

    if (asaasId && ASAAS_CONFIGURED) {
      const asaasCustomerId = row.asaas_customer_id?.trim() || null;
      if (!asaasCustomerId) {
        return {
          subscriptionId: row.id,
          outcome: 'failed',
          reason: 'missing_asaas_customer',
          gateway: 'asaas',
        };
      }

      const asaasResult = await syncAsaasSubscriptionComboRecurring(admin, {
        localSubscriptionId: row.id,
        asaasSubscriptionId: asaasId,
        asaasCustomerId,
        planName: plan.name,
        billingTerm: term,
        comboTotalCents: comboTotal,
        nextDueDate: nextBillingAt,
      });

      if (asaasResult.status === 'failed') {
        return {
          subscriptionId: row.id,
          outcome: 'failed',
          reason: asaasResult.reason,
          gateway: 'asaas',
        };
      }

      return {
        subscriptionId: row.id,
        outcome: 'synced',
        reason: asaasResult.status,
        gateway: 'asaas',
      };
    }

    return {
      subscriptionId: row.id,
      outcome: 'skipped',
      reason: 'gateway_not_configured',
      gateway: 'none',
    };
  } catch (error) {
    console.error('[combo-repair] subscription failed:', row.id, error);
    return {
      subscriptionId: row.id,
      outcome: 'failed',
      reason: error instanceof Error ? error.message : 'gateway_error',
      gateway: pagarmeId ? 'pagarme' : 'asaas',
    };
  }
}

export async function repairAllComboRecurringSubscriptions(
  admin: SupabaseClient,
  options: { dryRun?: boolean; subscriptionId?: string } = {}
): Promise<RepairComboRecurringBatchResult> {
  let query = admin
    .from('subscriptions')
    .select(
      `
      id,
      status,
      billing_term,
      prepaid_until,
      next_billing_date,
      combo_total_cents,
      combo_auto_renew,
      pending_billing_term,
      pagarme_subscription_id,
      pagarme_customer_id,
      asaas_subscription_id,
      asaas_customer_id,
      promo_code,
      shipping_cents,
      special_notes,
      plans!plan_id(name, slug, price_cents)
    `
    )
    .in('billing_term', ['combo_3', 'combo_6', 'combo_12'])
    .in('status', Array.from(ELIGIBLE_STATUSES));

  if (options.subscriptionId) {
    query = query.eq('id', options.subscriptionId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ComboSubscriptionRow[];
  const items: RepairComboRecurringItemResult[] = [];
  let synced = 0;
  let skipped = 0;
  let failed = 0;
  let backfilledComboTotal = 0;

  for (const row of rows) {
    const beforeTotal = row.combo_total_cents;
    const result = await repairComboRecurringSubscription(admin, row, options);
    items.push(result);

    if (result.outcome === 'synced') synced += 1;
    else if (result.outcome === 'skipped') skipped += 1;
    else failed += 1;

    if (
      !options.dryRun &&
      (beforeTotal == null || beforeTotal <= 0) &&
      result.outcome === 'synced' &&
      result.reason !== 'dry_run'
    ) {
      backfilledComboTotal += 1;
    }
  }

  return {
    scanned: rows.length,
    synced,
    skipped,
    failed,
    backfilledComboTotal,
    items,
  };
}
