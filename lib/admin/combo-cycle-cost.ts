import type { SupabaseClient } from '@supabase/supabase-js';
import { relOne } from '@/lib/dashboard/format';
import {
  buildCycleShipmentItems,
  listAddonPaymentsForSubscription,
  listBundledStoreOrdersBySubscription,
  loadSiblingCyclesBySubscription,
  type CycleShipmentContext,
} from '@/lib/admin/cycle-shipment-items';
import {
  buildPlanProductionCostMap,
  resolveCycleShipmentFinance,
} from '@/lib/admin/cycle-shipment-finance';
import { mergeMonthlyKitProductionCosts } from '@/lib/admin/store-products';
import { isComboPrepaidPayment } from '@/lib/payments/effective-amount';

const COMBO_CYCLE_STATUSES = [
  'production',
  'preparing',
  'shipped',
  'delivered',
] as const;

const COMBO_CYCLE_SELECT = `
  id,
  subscription_id,
  cycle_number,
  status,
  payment_id,
  paid_at,
  created_at,
  updated_at,
  amount_cents,
  shipping_cost_cents,
  subscriptions(
    special_notes,
    is_partner,
    plans!plan_id(name, slug, production_cost_cents)
  ),
  payments(status_detail)
`;

function toShipmentContext(row: {
  id: string;
  subscription_id: string;
  cycle_number: number;
  status: string;
  paid_at: string | null;
  created_at: string | null;
}): CycleShipmentContext {
  return {
    cycleId: row.id,
    cycleNumber: row.cycle_number,
    subscriptionId: row.subscription_id,
    status: row.status as CycleShipmentContext['status'],
    paidAt: row.paid_at,
    createdAt: row.created_at,
  };
}

async function loadComboPrepaidPaymentIds(
  admin: SupabaseClient
): Promise<Set<string>> {
  const { data, error } = await admin
    .from('payments')
    .select('id, status_detail')
    .eq('status', 'approved')
    .ilike('status_detail', '%combo_prepaid%');

  if (error) {
    console.error('[admin] loadComboPrepaidPaymentIds:', error.message);
    return new Set();
  }

  return new Set(
    (data ?? [])
      .filter((row) => isComboPrepaidPayment(row.status_detail as string | null))
      .map((row) => row.id as string)
  );
}

async function resolveComboCycleProductionCosts(
  admin: SupabaseClient,
  rawRows: Array<Record<string, unknown>>
): Promise<Array<{ cycleId: string; costCents: number; monthKey: string }>> {
  if (rawRows.length === 0) return [];

  const subscriptionIds = Array.from(
    new Set(rawRows.map((row) => row.subscription_id as string))
  );

  const [storeOrdersBySub, plansRes, addonPaymentsBySub, siblingsBySub] =
    await Promise.all([
      listBundledStoreOrdersBySubscription(admin, subscriptionIds),
      admin.from('plans').select('slug, production_cost_cents'),
      Promise.all(
        subscriptionIds.map(async (subscriptionId) => {
          const payments = await listAddonPaymentsForSubscription(
            admin,
            subscriptionId,
            null
          );
          return [subscriptionId, payments] as const;
        })
      ),
      loadSiblingCyclesBySubscription(admin, subscriptionIds),
    ]);

  const planProductionBySlug = await mergeMonthlyKitProductionCosts(
    admin,
    buildPlanProductionCostMap(
      (plansRes.data ?? []) as Array<{ slug: string; production_cost_cents: number }>
    )
  );
  const addonPaymentsMap = new Map(addonPaymentsBySub);

  return rawRows.map((raw) => {
    const subscription = relOne(
      raw.subscriptions as Record<string, unknown> | Record<string, unknown>[] | null
    );
    const plan = relOne(
      subscription?.plans as Record<string, unknown> | Record<string, unknown>[] | null
    );
    const cycleRow = {
      id: raw.id as string,
      subscription_id: raw.subscription_id as string,
      cycle_number: raw.cycle_number as number,
      status: raw.status as string,
      paid_at: (raw.paid_at as string | null) ?? null,
      created_at: (raw.created_at as string | null) ?? null,
      amount_cents: (raw.amount_cents as number | null) ?? null,
      shipping_cost_cents: (raw.shipping_cost_cents as number | null) ?? null,
      payment_id: (raw.payment_id as string | null) ?? null,
    };

    const cycleContext = toShipmentContext(cycleRow);
    const siblingCycles =
      siblingsBySub.get(cycleRow.subscription_id) ?? [cycleContext];
    const storeOrders = storeOrdersBySub.get(cycleRow.subscription_id) ?? [];
    const specialNotes = (subscription?.special_notes as string | null) ?? null;

    const shipmentItems = buildCycleShipmentItems({
      cycle: cycleContext,
      siblingCycles,
      specialNotes,
      storeOrders,
    });

    const finance = resolveCycleShipmentFinance({
      cycleAmountCents: cycleRow.amount_cents,
      cyclePaymentId: cycleRow.payment_id,
      shippingCostCents: cycleRow.shipping_cost_cents,
      subscriptionPlanProductionCostCents:
        (plan?.production_cost_cents as number | null) ?? 0,
      planProductionBySlug,
      cycle: cycleContext,
      siblingCycles,
      shipmentItems,
      storeOrders,
      addonPayments: addonPaymentsMap.get(cycleRow.subscription_id) ?? [],
      specialNotes,
      isPartner: Boolean(subscription?.is_partner),
    });

    const updatedAt = (raw.updated_at as string | null) ?? cycleRow.paid_at ?? cycleRow.created_at;
    return {
      cycleId: cycleRow.id,
      costCents: finance.totalProductionCostCents,
      monthKey: updatedAt ? updatedAt.slice(0, 7) : '',
    };
  });
}

export async function sumComboCycleProductionCosts(
  admin: SupabaseClient,
  from: string,
  to: string
): Promise<number> {
  const byMonth = await sumComboCycleProductionCostsByMonth(admin, from, to);
  return Array.from(byMonth.values()).reduce((sum, cents) => sum + cents, 0);
}

export async function sumComboCycleProductionCostsByMonth(
  admin: SupabaseClient,
  from: string,
  to: string
): Promise<Map<string, number>> {
  const comboPaymentIds = await loadComboPrepaidPaymentIds(admin);
  if (comboPaymentIds.size === 0) return new Map();

  const { data, error } = await admin
    .from('subscription_cycles')
    .select(COMBO_CYCLE_SELECT)
    .in('status', [...COMBO_CYCLE_STATUSES])
    .gte('updated_at', `${from}T00:00:00`)
    .lte('updated_at', `${to}T23:59:59`);

  if (error) {
    console.error('[admin] sumComboCycleProductionCostsByMonth:', error.message);
    return new Map();
  }

  const comboCycles = (data ?? []).filter((row) => {
    const paymentId = row.payment_id as string | null;
    if (!paymentId || !comboPaymentIds.has(paymentId)) return false;

    const payment = relOne(
      row.payments as Record<string, unknown> | Record<string, unknown>[] | null
    );
    return isComboPrepaidPayment((payment?.status_detail as string | null) ?? null);
  });

  const resolved = await resolveComboCycleProductionCosts(admin, comboCycles);
  const buckets = new Map<string, number>();

  for (const row of resolved) {
    if (!row.monthKey) continue;
    buckets.set(row.monthKey, (buckets.get(row.monthKey) ?? 0) + row.costCents);
  }

  return buckets;
}
