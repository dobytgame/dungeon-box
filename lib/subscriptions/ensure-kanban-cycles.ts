import type { SupabaseClient } from '@supabase/supabase-js';
import { mapRawMonthToProductionMonth } from '@/lib/admin/production-month';
import {
  backfillPrepaidComboProductionSchedules,
  resolveCycleScheduledMonthKey,
} from '@/lib/subscriptions/combo-production-schedule';

const PAID_OPEN_STATUSES = [
  'upcoming',
  'production',
  'preparing',
  'packed',
  'awaiting_pickup',
  'shipped',
  'delivered',
] as const;

/** Preenche `scheduled_production_month` em ciclos pagos que ficaram sem mês do kit. */
export async function pinMissingScheduledProductionMonths(
  supabase: SupabaseClient
): Promise<number> {
  const { data: cycles, error } = await supabase
    .from('subscription_cycles')
    .select('id, paid_at, created_at, scheduled_production_month, payment_id')
    .in('status', [...PAID_OPEN_STATUSES])
    .is('scheduled_production_month', null);

  if (error || !cycles?.length) return 0;

  const now = new Date().toISOString();
  let pinned = 0;

  for (const cycle of cycles) {
    const hasPaymentSignal = Boolean(cycle.payment_id || cycle.paid_at);
    if (!hasPaymentSignal) continue;

    const rawMonth = resolveCycleScheduledMonthKey({
      scheduled_production_month: null,
      paid_at: cycle.paid_at as string | null,
      created_at: cycle.created_at as string | null,
    });
    if (!rawMonth) continue;

    const monthKey = mapRawMonthToProductionMonth(rawMonth);
    const { error: updateError } = await supabase
      .from('subscription_cycles')
      .update({
        scheduled_production_month: `${monthKey}-01`,
        updated_at: now,
      })
      .eq('id', cycle.id as string)
      .is('scheduled_production_month', null);

    if (!updateError) pinned += 1;
  }

  return pinned;
}

/** Varredura: combos sem fila de kits + ciclos pagos sem mês no kanban. */
export async function ensurePaidSubscriptionsHaveKanbanCycles(
  supabase: SupabaseClient
): Promise<{
  comboSubscriptionsScheduled: number;
  comboCyclesCreated: number;
  kitMonthsPinned: number;
}> {
  const comboBackfill = await backfillPrepaidComboProductionSchedules(supabase);
  const kitMonthsPinned = await pinMissingScheduledProductionMonths(supabase);

  return {
    comboSubscriptionsScheduled: comboBackfill.subscriptions,
    comboCyclesCreated: comboBackfill.cyclesCreated,
    kitMonthsPinned,
  };
}
