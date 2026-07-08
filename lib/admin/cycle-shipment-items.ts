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
import { isMonthlyKitProductId, parseMonthlyKitPlanSlug } from '@/lib/store/monthly-kits';
import { inferPlanSlugFromText } from '@/lib/store/plan-slug-infer';
import type { CycleStatus } from '@/lib/dashboard/types';
import {
  buildPlanProductionCostMap,
  resolveCycleShipmentFinance,
} from '@/lib/admin/cycle-shipment-finance';
import {
  loadSubscriptionPaymentMaps,
  pickCyclePaymentContext,
} from '@/lib/admin/cycle-payment-resolve';
import { mergeMonthlyKitProductionCosts } from '@/lib/admin/store-products';

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
  planSlug?: string | null;
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

export interface StoreOrderPaymentRow {
  id: string;
  amount_cents: number;
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

const FULFILLMENT_CYCLE_STATUSES = new Set<CycleStatus>([
  'upcoming',
  'production',
  'preparing',
  'shipped',
  'delivered',
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
    const firstCycle = [...siblingCycles].sort(
      (a, b) => a.cycleNumber - b.cycleNumber
    )[0];
    if (!firstCycle || firstCycle.cycleId !== cycle.cycleId) return null;
  } else if (!FULFILLMENT_CYCLE_STATUSES.has(cycle.status)) {
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
    if (!line.bundleSubscriptionId && !bundled) {
      if (line.kind !== 'monthly-kit' && !isMonthlyKitProductId(line.productId)) {
        continue;
      }
    }

    if (line.kind === 'monthly-kit' || isMonthlyKitProductId(line.productId)) {
      const planName =
        typeof line.planName === 'string' ? line.planName : null;
      const themeName =
        typeof line.themeName === 'string' ? line.themeName : null;
      const detail = [planName, themeName].filter(Boolean).join(' · ') || null;
      const name =
        line.name ||
        (planName ? `Kit do mês — ${planName}` : 'Kit do mês adicional');

      const planSlug =
        (typeof line.planSlug === 'string' ? line.planSlug : null) ??
        parseMonthlyKitPlanSlug(line.productId) ??
        inferPlanSlugFromText(
          typeof line.planName === 'string' ? line.planName : null
        ) ??
        inferPlanSlugFromText(line.name);

      items.push({
        id: `monthly-kit:${line.productId}:${line.quantity}`,
        kind: 'monthly-kit',
        name,
        tag: itemTag('monthly-kit', line.quantity),
        quantity: line.quantity,
        detail,
        source: 'store_order',
        paymentPending,
        planSlug,
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
  if (meta.shippingMode === 'standalone') return false;
  if (meta.shippingMode === 'with_subscription') return true;
  if (meta.bundleSubscriptionId) return true;
  if (meta.items.some((line) => Boolean(line.bundleSubscriptionId))) return true;
  if (paymentSubscriptionId) return true;
  return false;
}

function cycleStartTimestamp(cycle: CycleShipmentContext): number {
  const raw = cycle.paidAt ?? cycle.createdAt;
  return raw ? Date.parse(raw) : Number.POSITIVE_INFINITY;
}

/** Atribui pedido da loja ao ciclo em que foi (ou será) enviado. */
export function assignStoreOrderToCycle(
  order: StoreOrderPaymentRow,
  siblingCycles: CycleShipmentContext[]
): CycleShipmentContext | null {
  const sorted = [...siblingCycles].sort(
    (a, b) => a.cycleNumber - b.cycleNumber
  );
  if (sorted.length === 0) return null;

  const orderTime = orderTimestamp(order);
  if (!orderTime) {
    return firstOpenCycle(sorted) ?? sorted[sorted.length - 1] ?? null;
  }

  for (let index = 0; index < sorted.length; index += 1) {
    const cycle = sorted[index];
    const nextCycle = sorted[index + 1];
    if (!nextCycle) {
      return cycle;
    }

    const nextCycleStart = cycleStartTimestamp(nextCycle);
    if (orderTime < nextCycleStart) {
      return cycle;
    }
  }

  return sorted[sorted.length - 1] ?? null;
}

/** Atribui pedidos da loja ao ciclo de envio correspondente. */
export function storeOrdersForCycle(
  cycle: CycleShipmentContext,
  siblingCycles: CycleShipmentContext[],
  storeOrders: StoreOrderPaymentRow[]
): CycleShipmentItem[] {
  const matched = storeOrders.filter((order) => {
    if (order.paymentStatus !== 'approved') return false;
    const assigned = assignStoreOrderToCycle(order, siblingCycles);
    return assigned?.cycleId === cycle.cycleId;
  });

  const items: CycleShipmentItem[] = [];
  for (const order of matched) {
    items.push(...itemsFromStoreOrderMeta(order.meta, false));
  }
  return items;
}

function describeStoreOrderLine(
  line: StoreOrderPaymentRow['meta']['items'][number]
): string {
  return line.quantity > 1 ? `${line.name} ×${line.quantity}` : line.name;
}

/** Pedidos da loja vinculados ao ciclo com pagamento ainda pendente (fora da produção). */
export function pendingStoreOrdersForCycle(
  cycle: CycleShipmentContext,
  siblingCycles: CycleShipmentContext[],
  storeOrders: StoreOrderPaymentRow[]
): StoreOrderPaymentRow[] {
  return storeOrders.filter((order) => {
    if (order.paymentStatus !== 'pending') return false;
    const assigned = assignStoreOrderToCycle(order, siblingCycles);
    return assigned?.cycleId === cycle.cycleId;
  });
}

export function describePendingStoreOrdersForCycle(
  cycle: CycleShipmentContext,
  siblingCycles: CycleShipmentContext[],
  storeOrders: StoreOrderPaymentRow[]
): { id: string; label: string; amountCents: number }[] {
  const pending = pendingStoreOrdersForCycle(cycle, siblingCycles, storeOrders);
  const rows: { id: string; label: string; amountCents: number }[] = [];

  for (const order of pending) {
    if (order.meta.items.length > 0) {
      order.meta.items.forEach((line, index) => {
        rows.push({
          id: `${order.id}:pending:${index}`,
          label: describeStoreOrderLine(line),
          amountCents:
            typeof line.lineTotalCents === 'number' && line.lineTotalCents > 0
              ? line.lineTotalCents
              : order.amount_cents,
        });
      });
      continue;
    }

    rows.push({
      id: `${order.id}:pending`,
      label: 'Pedido da loja',
      amountCents: order.amount_cents,
    });
  }

  return rows;
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

  for (const subscriptionId of subscriptionIds) {
    result.set(subscriptionId, []);
  }

  const { data, error } = await admin
    .from('subscription_cycles')
    .select('id, cycle_number, subscription_id, status, paid_at, created_at')
    .in('subscription_id', subscriptionIds)
    .order('cycle_number', { ascending: true });

  if (error) {
    console.error('[admin] loadSiblingCyclesBySubscription:', error.message);
    return result;
  }

  for (const row of data ?? []) {
    const subscriptionId = row.subscription_id as string;
    const list = result.get(subscriptionId) ?? [];
    list.push({
      cycleId: row.id as string,
      cycleNumber: row.cycle_number as number,
      subscriptionId,
      status: row.status as CycleStatus,
      paidAt: (row.paid_at as string | null) ?? null,
      createdAt: (row.created_at as string | null) ?? null,
    });
    result.set(subscriptionId, list);
  }

  return result;
}

export async function loadAddonPaymentsBySubscription(
  admin: SupabaseClient,
  subscriptionIds: string[]
): Promise<
  Map<
    string,
    Array<{
      id: string;
      amount_cents: number;
      paid_at: string | null;
      created_at: string | null;
    }>
  >
> {
  const result = new Map<
    string,
    Array<{
      id: string;
      amount_cents: number;
      paid_at: string | null;
      created_at: string | null;
    }>
  >();
  if (subscriptionIds.length === 0) return result;

  for (const subscriptionId of subscriptionIds) {
    result.set(subscriptionId, []);
  }

  const { data, error } = await admin
    .from('payments')
    .select('id, amount_cents, paid_at, created_at, status_detail, subscription_id')
    .in('subscription_id', subscriptionIds)
    .eq('status', 'approved');

  if (error) {
    console.error('[admin] loadAddonPaymentsBySubscription:', error.message);
    return result;
  }

  for (const row of data ?? []) {
    const detail = row.status_detail as string | null;
    if (detail?.includes('store_order')) continue;

    const subscriptionId = row.subscription_id as string;
    const list = result.get(subscriptionId) ?? [];
    list.push({
      id: row.id as string,
      amount_cents: (row.amount_cents as number) ?? 0,
      paid_at: (row.paid_at as string | null) ?? null,
      created_at: (row.created_at as string | null) ?? null,
    });
    result.set(subscriptionId, list);
  }

  return result;
}

export async function listBundledStoreOrdersBySubscription(
  admin: SupabaseClient,
  subscriptionIds: string[],
  options?: { syncFromAsaas?: boolean }
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

  if (options?.syncFromAsaas) {
    await syncStoreOrdersFromAsaasForSubscriptions(admin, subscriptionIds);
    await syncPendingBundledStoreOrders(admin, userIds);
  }

  const paymentSelect =
    'id, amount_cents, paid_at, created_at, status_detail, subscription_id, user_id, status';

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
      amount_cents: (row.amount_cents as number) ?? 0,
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
    listBundledStoreOrdersBySubscription(admin, [input.subscriptionId], {
      syncFromAsaas: true,
    }),
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

export async function listAddonPaymentsForSubscription(
  admin: SupabaseClient,
  subscriptionId: string,
  cyclePaymentId: string | null
): Promise<
  Array<{
    id: string;
    amount_cents: number;
    paid_at: string | null;
    created_at: string | null;
  }>
> {
  let query = admin
    .from('payments')
    .select('id, amount_cents, paid_at, created_at, status_detail')
    .eq('subscription_id', subscriptionId)
    .eq('status', 'approved');

  if (cyclePaymentId) {
    query = query.neq('id', cyclePaymentId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[admin] listAddonPaymentsForSubscription:', error.message);
    return [];
  }

  return (data ?? [])
    .filter((row) => {
      const detail = row.status_detail as string | null;
      return !detail?.includes('store_order');
    })
    .map((row) => ({
      id: row.id as string,
      amount_cents: (row.amount_cents as number) ?? 0,
      paid_at: (row.paid_at as string | null) ?? null,
      created_at: (row.created_at as string | null) ?? null,
    }));
}

export async function resolveCycleProductionDataWithFinance(
  admin: SupabaseClient,
  input: {
    cycleId: string;
    cycleNumber: number;
    subscriptionId: string;
    status: CycleStatus;
    paidAt: string | null;
    createdAt: string | null;
    paymentId: string | null;
    amountCents: number | null;
    shippingCostCents: number | null;
    specialNotes: string | null | undefined;
    planName: string | null;
    planSlug: string | null;
    planProductionCostCents: number;
    themeName: string | null;
    piecesLabel: string | null;
    isPartner?: boolean;
    subscriptionBillingTerm?: string | null;
    subscriptionComboTotalCents?: number | null;
    subscriptionComboInstallments?: number | null;
    fallbackMonthlyRevenueCents?: number | null;
  }
) {
  const [
    siblingCycles,
    storeOrdersBySub,
    addonPayments,
    plansRes,
    cyclePaymentRes,
    paymentMaps,
  ] = await Promise.all([
    listSiblingCyclesForShipment(admin, input.subscriptionId),
    listBundledStoreOrdersBySubscription(admin, [input.subscriptionId], {
      syncFromAsaas: true,
    }),
    listAddonPaymentsForSubscription(
      admin,
      input.subscriptionId,
      input.paymentId
    ),
    admin.from('plans').select('slug, production_cost_cents'),
    input.paymentId
      ? admin
          .from('payments')
          .select('amount_cents, status_detail, installments')
          .eq('id', input.paymentId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    loadSubscriptionPaymentMaps(admin, [input.subscriptionId]),
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

  const planProductionBySlug = await mergeMonthlyKitProductionCosts(
    admin,
    buildPlanProductionCostMap(
      (plansRes.data ?? []) as Array<{
        slug: string;
        production_cost_cents: number;
      }>
    )
  );

  const billingTerm = input.subscriptionBillingTerm ?? null;
  const linkedPayment = cyclePaymentRes.data
    ? {
        amount_cents: (cyclePaymentRes.data.amount_cents as number) ?? 0,
        status_detail:
          (cyclePaymentRes.data.status_detail as string | null) ?? null,
        installments:
          (cyclePaymentRes.data.installments as number | null) ?? null,
      }
    : null;
  const cyclePayment = pickCyclePaymentContext({
    paymentId: input.paymentId,
    amountCents: input.amountCents,
    subscriptionId: input.subscriptionId,
    billingTerm,
    linkedPayment,
    comboBySub: paymentMaps.comboBySub,
    latestBySub: paymentMaps.latestBySub,
  });

  const finance = resolveCycleShipmentFinance({
    cycleAmountCents: input.amountCents,
    cyclePaymentId: input.paymentId,
    cyclePayment,
    subscriptionContext: {
      billing_term: billingTerm,
      combo_total_cents: input.subscriptionComboTotalCents ?? null,
      combo_installments: input.subscriptionComboInstallments ?? null,
    },
    shippingCostCents: input.shippingCostCents,
    subscriptionPlanProductionCostCents: input.planProductionCostCents,
    planProductionBySlug,
    cycle,
    siblingCycles,
    shipmentItems,
    storeOrders,
    addonPayments,
    specialNotes: input.specialNotes,
    isPartner: input.isPartner,
    fallbackMonthlyRevenueCents: input.fallbackMonthlyRevenueCents,
  });

  return { shipmentItems, productionChecklist, finance, pendingBundledOrders: describePendingStoreOrdersForCycle(cycle, siblingCycles, storeOrders) };
}
