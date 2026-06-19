import type { SubscriptionCycle } from '@/lib/dashboard/types';
import { relOne } from '@/lib/dashboard/format';

export interface AdminCycleDetailView {
  id: string;
  cycle_number: number;
  status: SubscriptionCycle['status'];
  amount_cents: number | null;
  paid_at: string | null;
  tracking_code: string | null;
  carrier: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  production_notes: string | null;
  estimated_delivery: string | null;
  themeName: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  userId: string | null;
  subscriptionId: string | null;
  planName: string | null;
  addressLine: string | null;
}

export function toAdminCycleDetailView(
  cycle: SubscriptionCycle
): AdminCycleDetailView {
  const subscription = relOne(cycle.subscriptions);
  const plan = subscription ? relOne(subscription.plans) : null;
  const address = subscription ? relOne(subscription.addresses) : null;
  const profile = subscription
    ? relOne(
        (subscription as { profiles?: unknown }).profiles as
          | {
              full_name?: string | null;
              display_name?: string | null;
              email?: string | null;
              phone?: string | null;
            }
          | {
              full_name?: string | null;
              display_name?: string | null;
              email?: string | null;
              phone?: string | null;
            }[]
          | null
          | undefined
      )
    : null;
  const theme = relOne(cycle.themes);

  const addressLine = address
    ? `${address.street}, ${address.number}${
        address.complement ? ` — ${address.complement}` : ''
      } · ${address.city}/${address.state} · ${address.zip_code}`
    : null;

  return {
    id: cycle.id,
    cycle_number: cycle.cycle_number,
    status: cycle.status,
    amount_cents: cycle.amount_cents,
    paid_at: cycle.paid_at,
    tracking_code: cycle.tracking_code,
    carrier: cycle.carrier,
    shipped_at: cycle.shipped_at,
    delivered_at: cycle.delivered_at,
    cancelled_at: cycle.cancelled_at,
    cancel_reason: cycle.cancel_reason,
    production_notes: cycle.production_notes,
    estimated_delivery: cycle.estimated_delivery,
    themeName: theme?.name ?? null,
    customerName:
      profile?.full_name ?? profile?.display_name ?? profile?.email ?? null,
    customerEmail: profile?.email ?? null,
    customerPhone: profile?.phone ?? null,
    userId: subscription?.user_id ?? null,
    subscriptionId: subscription?.id ?? null,
    planName: plan?.name ?? null,
    addressLine,
  };
}
