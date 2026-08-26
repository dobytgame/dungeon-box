import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildCycleShipmentItems,
  listBundledStoreOrdersBySubscription,
  loadSiblingCyclesBySubscription,
  type CycleShipmentItem,
} from '@/lib/admin/cycle-shipment-items';
import type { CycleStatus } from '@/lib/dashboard/types';

export type DashboardCycleExtra = CycleShipmentItem;

export async function loadDashboardCycleExtras(
  admin: SupabaseClient,
  cycles: Array<{
    id: string;
    subscription_id: string;
    cycle_number: number;
    status: CycleStatus;
    paid_at: string | null;
    created_at: string | null;
  }>
): Promise<Map<string, DashboardCycleExtra[]>> {
  const extrasByCycleId = new Map<string, DashboardCycleExtra[]>();
  if (cycles.length === 0) return extrasByCycleId;

  const subscriptionIds = Array.from(
    new Set(cycles.map((cycle) => cycle.subscription_id))
  );

  const [{ data: subscriptions }, storeOrdersBySub, siblingsBySub] =
    await Promise.all([
      admin
        .from('subscriptions')
        .select('id, special_notes')
        .in('id', subscriptionIds),
      listBundledStoreOrdersBySubscription(admin, subscriptionIds),
      loadSiblingCyclesBySubscription(admin, subscriptionIds),
    ]);

  const notesBySub = new Map<string, string | null>(
    (subscriptions ?? []).map((row) => [
      row.id as string,
      (row.special_notes as string | null) ?? null,
    ])
  );

  for (const cycle of cycles) {
    const siblingCycles = siblingsBySub.get(cycle.subscription_id) ?? [];
    const extras = buildCycleShipmentItems({
      cycle: {
        cycleId: cycle.id,
        cycleNumber: cycle.cycle_number,
        subscriptionId: cycle.subscription_id,
        status: cycle.status,
        paidAt: cycle.paid_at,
        createdAt: cycle.created_at,
      },
      siblingCycles,
      specialNotes: notesBySub.get(cycle.subscription_id),
      storeOrders: storeOrdersBySub.get(cycle.subscription_id) ?? [],
    });
    extrasByCycleId.set(cycle.id, extras);
  }

  return extrasByCycleId;
}
