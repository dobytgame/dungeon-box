import type { SupabaseClient } from '@supabase/supabase-js';
import { getPaintKitBump } from '@/lib/checkout/order-bumps';
import {
  parsePaintKitBump,
  parsePaintKitBumpRecurring,
} from '@/lib/checkout/special-notes';
import {
  parseStoreOrderMeta,
  syncPendingBundledStoreOrders,
  syncStoreOrdersFromAsaasForSubscriptions,
  type StoreOrderMeta,
} from '@/lib/asaas/store-order-payment';
import { getStoreProduct, type StoreCatalogProductId } from '@/lib/store/catalog';
import { isMonthlyKitProductId } from '@/lib/store/monthly-kits';
import type { CycleStatus } from '@/lib/dashboard/types';

export type CycleShipmentItemKind = 'paint-kit' | 'monthly-kit' | 'store';
export type ProductionItemKind = 'subscription' | CycleShipmentItemKind;

export interface CycleShipmentItem {
  id: string;
  kind: CycleShipmentItemKind;
  name: string;
  tag: string;
  quantity: number;
  detail: string | null;
  source: 'subscription' | 'store_order';
  paymentPending?: boolean;
}

export interface ProductionChecklistItem {
  id: string;
  kind: ProductionItemKind;
  name: string;
  tag: string;
  quantity: number;
  detail: string | null;
  paymentPending?: boolean;
}

export interface CycleShipmentContext {
  cycleId: string;
  cycleNumber: number;
  subscriptionId: string;
  status: CycleStatus;
  paidAt: string | null;
  createdAt: string | null;
}

interface StoreOrderPaymentRow {
  id: string;
  paid_at: string | null;
  created_at: string | null;
  meta: StoreOrderMeta;
  paymentStatus: 'approved' | 'pending';
}

const OPEN_CYCLE_STATUSES = new Set<CycleStatus>([
  'upcoming',
  'production',
  'preparing',
]);

const KIND_TAG: Record<CycleShipmentItemKind, string> = {
  'paint-kit': 'Kit pintura',
  'monthly-kit': 'Kit do mês',
  store: 'Loja',
};

function itemTag(kind: CycleShipmentItemKind, quantity: number): string {
  const base = KIND_TAG[kind];
  return quantity > 1 ? `${base} ×${quantity}` : base;
}

function resolveBundledSubscriptionId(meta: StoreOrderMeta): string | null {
  if (meta.bundleSubscriptionId) return meta.bundleSubscriptionId;
  for (const line of meta.items) {
    if (line.bundleSubscriptionId) return line.bundleSubscriptionId;
  }
  return null;
}

function paintKitItemFromNotes(
  specialNotes: string | null | undefined,
  cycle: CycleShipmentContext,
  siblingCycles: CycleShipmentContext[]
): CycleShipmentItem | null {
  const bumpId = parsePaintKitBump(specialNotes);
  if (!bumpId) return null;

  const recurring = parsePaintKitBumpRecurring(specialNotes);
  if (!recurring) {
    const firstOpen = firstOpenCycle(siblingCycles);
    if (!firstOpen || firstOpen.cycleId !== cycle.cycleId) return null;
  } else if (!OPEN_CYCLE_STATUSES.has(cycle.status)) {
    return null;
  }

  const bump = getPaintKitBump(bumpId);
  if (!bump) return null;

  return {
    id: `paint-kit:${bumpId}`,
    kind: 'paint-kit',
    name: bump.name,
    tag: itemTag('paint-kit', 1),
    quantity: 1,
    detail: recurring ? 'Recorrente todo mês' : 'Cobrança única neste envio',
    source: 'subscription',
  };
}

function itemsFromStoreOrderMeta(
  meta: StoreOrderMeta,
  paymentPending = false
): CycleShipmentItem[] {
  const items: CycleShipmentItem[] = [];
  const bundled =
    meta.shippingMode === 'with_subscription' || Boolean(meta.bundleSubscriptionId);

  for (const line of meta.items) {
    if (!line.bundleSubscriptionId && !bundled) continue;

    if (line.kind === 'monthly-kit' || isMonthlyKitProductId(line.productId)) {
      const planName =
        typeof line.planName === 'string' ? line.planName : null;
      const themeName =
        typeof line.themeName === 'string' ? line.themeName : null;
      const detail = [planName, themeName].filter(Boolean).join(' · ') || null;
      const name =
        line.name ||
        (planName ? `Kit do mês — ${planName}` : 'Kit do mês adicional');

      items.push({
        id: `monthly-kit:${line.productId}:${line.quantity}`,
        kind: 'monthly-kit',
        name,
        tag: itemTag('monthly-kit', line.quantity),
        quantity: line.quantity,
        detail,
        source: 'store_order',
        paymentPending,
      });
      continue;
    }

    const product = getStoreProduct(line.productId as StoreCatalogProductId);
    const kind: CycleShipmentItemKind = product?.paintKitBumpId
      ? 'paint-kit'
      : isMonthlyKitProductId(line.productId)
        ? 'monthly-kit'
        : 'store';

    items.push({
      id: `store:${line.productId}:${line.quantity}`,
      kind,
      name: line.name,
      tag: itemTag(kind, line.quantity),
      quantity: line.quantity,
      detail: null,
      source: 'store_order',
      paymentPending,
    });
  }

  return items;
}

function orderTimestamp(row: StoreOrderPaymentRow): number {
  const raw = row.paid_at ?? row.created_at;
  return raw ? Date.parse(raw) : 0;
}

function firstOpenCycle(
  siblingCycles: CycleShipmentContext[]
): CycleShipmentContext | null {
  const open = siblingCycles
    .filter((cycle) => OPEN_CYCLE_STATUSES.has(cycle.status))
    .sort((a, b) => a.cycleNumber - b.cycleNumber);
  return open[0] ?? null;
}

function isBundledStoreOrderMeta(
  meta: StoreOrderMeta,
  paymentSubscriptionId: string | null
): boolean {
  if (meta.shippingMode === 'with_subscription') return true;
  if (meta.bundleSubscriptionId) return true;
  if (meta.items.some((line) => Boolean(line.bundleSubscriptionId))) return true;
  if (paymentSubscriptionId) return true;
  return meta.items.some(
    (line) =>
      line.kind === 'monthly-kit' || isMonthlyKitProductId(line.productId)
  );
}

function assignStoreOrderToCycle(
  _order: StoreOrderPaymentRow,
  siblingCycles: CycleShipmentContext[]
): CycleShipmentContext | null {
  return firstOpenCycle(siblingCycles);
}

/** Atribui pedidos da loja ao ciclo de envio correspondente. */
export function storeOrdersForCycle(
  cycle: CycleShipmentContext,
  siblingCycles: CycleShipmentContext[],
  storeOrders: StoreOrderPaymentRow[]
): CycleShipmentItem[] {
  if (!OPEN_CYCLE_STATUSES.has(cycle.status)) {
    return [];
  }

  const matched = storeOrders.filter((order) => {
    const assigned = assignStoreOrderToCycle(order, siblingCycles);
    return assigned?.cycleId === cycle.cycleId;
  });

  const items: CycleShipmentItem[] = [];
  for (const order of matched) {
    items.push(
      ...itemsFromStoreOrderMeta(
        order.meta,
        order.paymentStatus === 'pending'
      )
    );
  }
  return items;
}

export function buildCycleShipmentItems(input: {
  cycle: CycleShipmentContext;
  siblingCycles: CycleShipmentContext[];
  specialNotes: string | null | undefined;
  storeOrders: StoreOrderPaymentRow[];
}): CycleShipmentItem[] {
  const fromStore = storeOrdersForCycle(
    input.cycle,
    input.siblingCycles,
    input.storeOrders
  );

  const fromNotes = paintKitItemFromNotes(
    input.specialNotes,
    input.cycle,
    input.siblingCycles
  );

  const merged = [...fromStore];
  if (fromNotes) {
    const storePaintKit = fromStore.some(
      (item) => item.kind === 'paint-kit' && item.source === 'store_order'
    );
    if (!storePaintKit) {
      merged.unshift(fromNotes);
    }
  }

  return merged;
}

export function buildProductionChecklist(input: {
  cycle: CycleShipmentContext;
  siblingCycles: CycleShipmentContext[];
  specialNotes: string | null | undefined;
  storeOrders: StoreOrderPaymentRow[];
  planName: string | null;
  themeName: string | null;
  piecesLabel: string | null;
}): ProductionChecklistItem[] {
  const checklist: ProductionChecklistItem[] = [];

  if (input.planName) {
    const themeDetail = input.themeName ? `Tema: ${input.themeName}` : null;
    const detail = [themeDetail, input.piecesLabel].filter(Boolean).join(' · ') || null;

    checklist.push({
      id: 'subscription-box',
      kind: 'subscription',
      name: `Caixa ${input.planName}`,
      tag: 'Assinatura',
      quantity: 1,
      detail,
    });
  }

  const extras = buildCycleShipmentItems({
    cycle: input.cycle,
    siblingCycles: input.siblingCycles,
    specialNotes: input.specialNotes,
    storeOrders: input.storeOrders,
  });

  for (const item of extras) {
    checklist.push({
      id: item.id,
      kind: item.kind,
      name: item.name,
      tag: item.tag,
      quantity: item.quantity,
      detail: item.detail,
      paymentPending: item.paymentPending,
    });
  }

  return checklist;
}

export function shipmentItemTags(
  items: CycleShipmentItem[]
): { tag: string; kind: CycleShipmentItemKind }[] {
  const seen = new Set<string>();
  const tags: { tag: string; kind: CycleShipmentItemKind }[] = [];
  for (const item of items) {
    if (seen.has(item.tag)) continue;
    seen.add(item.tag);
    tags.push({ tag: item.tag, kind: item.kind });
  }
  return tags;
}

export async function loadSiblingCyclesBySubscription(
  admin: SupabaseClient,
  subscriptionIds: string[]
): Promise<Map<string, CycleShipmentContext[]>> {
  const result = new Map<string, CycleShipmentContext[]>();
  if (subscriptionIds.length === 0) return result;

  await Promise.all(
    subscriptionIds.map(async (subscriptionId) => {
      const siblings = await listSiblingCyclesForShipment(admin, subscriptionId);
      result.set(subscriptionId, siblings);
    })
  );

  return result;
}

export async function listBundledStoreOrdersBySubscription(
  admin: SupabaseClient,
  subscriptionIds: string[]
): Promise<Map<string, StoreOrderPaymentRow[]>> {
  const result = new Map<string, StoreOrderPaymentRow[]>();
  if (subscriptionIds.length === 0) return result;

  for (const id of subscriptionIds) {
    result.set(id, []);
  }

  const { data: subscriptions } = await admin
    .from('subscriptions')
    .select('id, user_id')
    .in('id', subscriptionIds);

  const userIds = Array.from(
    new Set((subscriptions ?? []).map((row) => row.user_id as string))
  );

  await syncStoreOrdersFromAsaasForSubscriptions(admin, subscriptionIds);
  await syncPendingBundledStoreOrders(admin, userIds);

  const paymentSelect =
    'id, paid_at, created_at, status_detail, subscription_id, user_id, status';

  const { data: paymentRows, error } = await admin
    .from('payments')
    .select(paymentSelect)
    .in('user_id', userIds)
    .in('status', ['approved', 'pending'])
    .ilike('status_detail', '%store_order%');

  if (error) {
    console.error('[admin] listBundledStoreOrders:', error.message);
    return result;
  }

  const seenPaymentIds = new Set<string>();
  const seenStoreOrderIds = new Set<string>();

  for (const row of paymentRows ?? []) {
    const paymentId = row.id as string;
    if (seenPaymentIds.has(paymentId)) continue;

    const meta = parseStoreOrderMeta(row.status_detail);
    if (!meta) continue;

    const paymentSubId = row.subscription_id as string | null;
    if (!isBundledStoreOrderMeta(meta, paymentSubId)) continue;

    const bundledSubId =
      resolveBundledSubscriptionId(meta) ?? paymentSubId;
    if (!bundledSubId || !subscriptionIds.includes(bundledSubId)) continue;

    if (
      meta.shippingMode === 'standalone' &&
      !paymentSubId &&
      !meta.bundleSubscriptionId
    ) {
      continue;
    }

    if (meta.orderId) {
      const dedupeKey = `${bundledSubId}:${meta.orderId}`;
      if (seenStoreOrderIds.has(dedupeKey)) continue;
      seenStoreOrderIds.add(dedupeKey);
    }

    seenPaymentIds.add(paymentId);

    const bucket = result.get(bundledSubId) ?? [];
    bucket.push({
      id: paymentId,
      paid_at: (row.paid_at as string | null) ?? null,
      created_at: (row.created_at as string | null) ?? null,
      meta,
      paymentStatus:
        row.status === 'approved'
          ? 'approved'
          : 'pending',
    });
    result.set(bundledSubId, bucket);
  }

  for (const subId of Array.from(result.keys())) {
    const orders = result.get(subId) ?? [];
    orders.sort((a, b) => orderTimestamp(a) - orderTimestamp(b));
    result.set(subId, orders);
  }

  return result;
}

export async function listSiblingCyclesForShipment(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<CycleShipmentContext[]> {
  const { data, error } = await admin
    .from('subscription_cycles')
    .select('id, cycle_number, subscription_id, status, paid_at, created_at')
    .eq('subscription_id', subscriptionId)
    .order('cycle_number', { ascending: true });

  if (error) {
    console.error('[admin] listSiblingCycles:', error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    cycleId: row.id as string,
    cycleNumber: row.cycle_number as number,
    subscriptionId: row.subscription_id as string,
    status: row.status as CycleStatus,
    paidAt: (row.paid_at as string | null) ?? null,
    createdAt: (row.created_at as string | null) ?? null,
  }));
}

export async function resolveCycleProductionData(
  admin: SupabaseClient,
  input: {
    cycleId: string;
    cycleNumber: number;
    subscriptionId: string;
    status: CycleStatus;
    paidAt: string | null;
    createdAt: string | null;
    specialNotes: string | null | undefined;
    planName: string | null;
    themeName: string | null;
    piecesLabel: string | null;
  }
) {
  const [siblingCycles, storeOrdersBySub] = await Promise.all([
    listSiblingCyclesForShipment(admin, input.subscriptionId),
    listBundledStoreOrdersBySubscription(admin, [input.subscriptionId]),
  ]);

  const cycle: CycleShipmentContext = {
    cycleId: input.cycleId,
    cycleNumber: input.cycleNumber,
    subscriptionId: input.subscriptionId,
    status: input.status,
    paidAt: input.paidAt,
    createdAt: input.createdAt,
  };

  const storeOrders = storeOrdersBySub.get(input.subscriptionId) ?? [];

  const shipmentItems = buildCycleShipmentItems({
    cycle,
    siblingCycles,
    specialNotes: input.specialNotes,
    storeOrders,
  });

  const productionChecklist = buildProductionChecklist({
    cycle,
    siblingCycles,
    specialNotes: input.specialNotes,
    storeOrders,
    planName: input.planName,
    themeName: input.themeName,
    piecesLabel: input.piecesLabel,
  });

  return { shipmentItems, productionChecklist };
}
