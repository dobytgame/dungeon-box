import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isComboTerm,
  prepaidMonthsForTerm,
  type BillingTerm,
} from '@/lib/checkout/combo-billing';
import { isOnOrAfterPrepaidEndDay } from '@/lib/payments/prepaid-renewal';
import { seedPrepaidComboProductionSchedule } from '@/lib/subscriptions/combo-production-schedule';
import {
  countApprovedSubscriptionPayments,
  loyaltyLevelFromApprovedPayments,
  resolveRenewalTargetCycleNumberForSubscription,
} from '@/lib/subscriptions/monthly-production-schedule';

type CyclePaymentLink = {
  id: string;
  amount_cents: number | null;
  paid_at: string | null;
};

function addMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate())
  );
}

export function isComboPackageRenewalPayment(input: {
  billingTerm: BillingTerm;
  prepaidUntil: string | null | undefined;
  paidAt: string | null | undefined;
  comboAutoRenew?: boolean | null;
  pendingBillingTerm?: string | null;
}): boolean {
  if (!isComboTerm(input.billingTerm)) return false;
  if (input.pendingBillingTerm === 'monthly') return false;
  if (input.comboAutoRenew === false) return false;
  return isOnOrAfterPrepaidEndDay(input.prepaidUntil, input.paidAt);
}

/** Renovação automática do mesmo pacote combo (novos ciclos + estende prepaid_until). */
export async function processComboPackageRenewal(
  supabase: SupabaseClient,
  subscriptionId: string,
  billingTerm: Exclude<BillingTerm, 'monthly'>,
  payment: CyclePaymentLink
): Promise<'renewal'> {
  const months = prepaidMonthsForTerm(billingTerm);
  if (!months) return 'renewal';

  const paidAt = payment.paid_at ?? new Date().toISOString();
  const anchor = new Date(paidAt);
  const newPrepaidUntil = addMonths(anchor, months).toISOString();

  const startCycleNumber = await resolveRenewalTargetCycleNumberForSubscription(
    supabase,
    subscriptionId
  );

  await seedPrepaidComboProductionSchedule(supabase, {
    subscriptionId,
    billingTerm,
    paymentLink: payment,
    anchorDate: anchor,
    startCycleNumber,
  });

  const approvedPayments = await countApprovedSubscriptionPayments(
    supabase,
    subscriptionId
  );

  await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      prepaid_until: newPrepaidUntil,
      prepaid_months: months,
      next_billing_date: newPrepaidUntil,
      current_period_start: paidAt,
      current_period_end: newPrepaidUntil,
      current_cycle: startCycleNumber,
      loyalty_level: loyaltyLevelFromApprovedPayments(approvedPayments),
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId);

  return 'renewal';
}
