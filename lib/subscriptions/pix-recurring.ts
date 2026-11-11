import type { SupabaseClient } from '@supabase/supabase-js';
import { isComboTerm, type BillingTerm } from '@/lib/checkout/combo-billing';

export function hasRecurringGateway(row: {
  asaas_subscription_id?: string | null;
  pagarme_subscription_id?: string | null;
  stripe_subscription_id?: string | null;
  mp_subscription_id?: string | null;
}): boolean {
  return Boolean(
    row.asaas_subscription_id ||
      row.pagarme_subscription_id ||
      row.stripe_subscription_id ||
      row.mp_subscription_id
  );
}

export function comboStillPrepaid(
  billingTerm: string | null | undefined,
  prepaidUntil: string | null | undefined,
  now = new Date()
): boolean {
  if (!billingTerm || !isComboTerm(billingTerm as BillingTerm)) return false;
  if (!prepaidUntil) return false;
  return new Date(prepaidUntil).getTime() > now.getTime();
}

export function isPixSubscriptionNeedingCardMigrationSync(
  sub: {
    status: string;
    is_partner?: boolean | null;
    billing_term?: string | null;
    prepaid_until?: string | null;
    asaas_subscription_id?: string | null;
    pagarme_subscription_id?: string | null;
    stripe_subscription_id?: string | null;
    mp_subscription_id?: string | null;
    migrated_to_pagarme_at?: string | null;
  },
  hasPixPayment: boolean
): boolean {
  if (sub.is_partner) return false;
  if (sub.status !== 'active' && sub.status !== 'past_due') return false;
  if (hasRecurringGateway(sub)) return false;
  if (sub.migrated_to_pagarme_at) return false;
  if (
    comboStillPrepaid(
      sub.billing_term,
      sub.prepaid_until as string | null | undefined
    )
  ) {
    return false;
  }
  return hasPixPayment;
}

export async function subscriptionHasPixPayment(
  client: SupabaseClient,
  subscriptionId: string
): Promise<boolean> {
  const { count } = await client
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('subscription_id', subscriptionId)
    .eq('payment_method', 'pix');

  return (count ?? 0) > 0;
}
