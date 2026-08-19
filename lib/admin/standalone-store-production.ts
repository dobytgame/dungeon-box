import type { SupabaseClient } from '@supabase/supabase-js';
import {
  mapRawMonthToProductionMonth,
} from '@/lib/admin/production-month';
import type { ProductionKanbanBoard } from '@/lib/admin/queries';
import { storeOrderMetaToExtraItems } from '@/lib/admin/cycle-shipment-items';
import {
  cloneProductionKanbanBoard,
  formatProductionShippingAddress,
} from '@/lib/admin/production-list';
import type { AdminCycleExtraItem, AdminCycleRow } from '@/lib/admin/types';
import {
  enrichStoreOrderPurchaseViews,
  storeOrderPurchaseFromMeta,
} from '@/lib/admin/store-order-lines';
import {
  toStandaloneStoreOrderDetailView,
  type AdminCycleDetailView,
} from '@/lib/admin/cycle-detail-view';
import { formatZip } from '@/lib/dashboard/format';
import {
  parseStandaloneFulfillmentStatus,
  parseStoreOrderMeta,
  readStoreOrderPaymentMeta,
  updateStandaloneStoreOrderMeta,
  type StoreOrderMeta,
} from '@/lib/asaas/store-order-payment';
import { notifyStandaloneStoreFulfillmentStatus } from '@/lib/email/standalone-fulfillment-notify';
import type { CycleStatus } from '@/lib/dashboard/types';
import {
  canTransitionCycle,
  compareCyclesByKitPaymentDate,
  compareCyclesByPurchaseOrder,
  cycleTransitionErrorMessage,
  isCycleReopenTransition,
  isCycleRollbackTransition,
  parseCycleStatus,
  PRODUCTION_PIPELINE,
} from '@/lib/subscriptions/cycle-production';

export const STANDALONE_STORE_CARD_PREFIX = 'standalone:';

export type StandaloneStoreOrderRow = {
  paymentId: string;
  userId: string;
  amountCents: number;
  paidAt: string | null;
  createdAt: string | null;
  meta: StoreOrderMeta;
  customerName: string | null;
  customerEmail: string | null;
  city: string | null;
  state: string | null;
  shippingAddressLine: string | null;
  status: CycleStatus;
};

export function isStandaloneStoreCardId(id: string): boolean {
  return id.startsWith(STANDALONE_STORE_CARD_PREFIX);
}

export function parseStandaloneStorePaymentId(cardId: string): string | null {
  if (!isStandaloneStoreCardId(cardId)) return null;
  const paymentId = cardId.slice(STANDALONE_STORE_CARD_PREFIX.length);
  return paymentId.length > 0 ? paymentId : null;
}

export function standaloneStoreCardId(paymentId: string): string {
  return `${STANDALONE_STORE_CARD_PREFIX}${paymentId}`;
}

export function standaloneOrderProductionMonthKey(
  order: Pick<StandaloneStoreOrderRow, 'paidAt' | 'createdAt'>
): string | null {
  const raw = order.paidAt ?? order.createdAt;
  if (!raw) return null;
  return mapRawMonthToProductionMonth(raw.slice(0, 7));
}

const MERGE_TARGET_STATUSES = ['upcoming', 'production'] as const;

type MergeTargetColumn = (typeof MERGE_TARGET_STATUSES)[number];

function findMergeTargetForUser(
  board: ProductionKanbanBoard,
  userId: string
): AdminCycleRow | null {
  for (const status of MERGE_TARGET_STATUSES) {
    const rows = board[status as MergeTargetColumn].filter(
      (row: AdminCycleRow) => row.userId === userId
    );
    const subscriptionRow = rows.find((row) => !row.isStandaloneStoreOrder);
    if (subscriptionRow) return subscriptionRow;
    const standaloneRow = rows.find((row) => row.isStandaloneStoreOrder);
    if (standaloneRow) return standaloneRow;
  }
  return null;
}

function appendStandaloneItemsToRow(
  row: AdminCycleRow,
  order: StandaloneStoreOrderRow
): void {
  const newItems = storeOrderMetaToExtraItems(order.meta, false);
  const existingIds = new Set(row.extraItems.map((item) => item.id));
  for (const item of newItems) {
    if (!existingIds.has(item.id)) {
      row.extraItems.push(item);
      existingIds.add(item.id);
    }
  }

  row.standaloneStoreOrderIds = Array.from(
    new Set([...(row.standaloneStoreOrderIds ?? []), order.paymentId])
  );
  row.hasBundledItems = row.extraItems.length > 0;
  row.hasBundledRevenue = true;
  row.totalRevenueCents = (row.totalRevenueCents ?? 0) + order.amountCents;
}

function describeStandaloneOrder(meta: StoreOrderMeta): string {
  if (!meta.items.length) return 'Loja avulsa';
  return meta.items
    .map((line) =>
      line.quantity > 1 ? `${line.name} ×${line.quantity}` : line.name
    )
    .join(', ');
}

export function buildStandaloneStoreCycleRow(
  order: StandaloneStoreOrderRow
): AdminCycleRow {
  const extraItems = storeOrderMetaToExtraItems(order.meta, false);

  const productionMonthKey = standaloneOrderProductionMonthKey(order);

  return {
    id: standaloneStoreCardId(order.paymentId),
    subscription_id: order.paymentId,
    cycle_number: 1,
    status: order.status,
    tracking_code: order.meta.trackingCode ?? null,
    carrier: order.meta.carrier ?? null,
    shipped_at: order.meta.shippedAt ?? null,
    paid_at: order.paidAt,
    created_at: order.createdAt,
    scheduledProductionMonth: productionMonthKey,
    amount_cents: order.amountCents,
    shipping_cost_cents: order.meta.shippingCostCents ?? null,
    payment_id: order.paymentId,
    productionNotes: order.meta.productionNotes ?? null,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    planName: describeStandaloneOrder(order.meta),
    planSlug: null,
    planProductionCostCents: 0,
    themeName: order.meta.items.find((line) => line.themeName)?.themeName as
      | string
      | undefined ?? null,
    city: order.city,
    state: order.state,
    shippingAddressLine: order.shippingAddressLine,
    userId: order.userId,
    subscriptionStatus: null,
    subscriptionContractedAt: order.createdAt ?? order.paidAt,
    subscriptionStartedAt: null,
    currentCyclePaidAt: order.paidAt ?? order.createdAt,
    comboPurchasePaidAt: null,
    comboStartCycleNumber: null,
    subscriptionCurrentCycle: null,
    subscriptionBillingTerm: null,
    isPartner: false,
    hasBundledItems: extraItems.length > 0,
    bundledItemTags: extraItems.map((item) => ({
      tag: item.tag,
      kind: item.kind,
    })),
    extraItems,
    totalRevenueCents: order.amountCents,
    shipmentMarginCents: null,
    hasBundledRevenue: false,
    paymentPendingHighlight: false,
    isStandaloneStoreOrder: true,
    standaloneStoreOrderIds: [order.paymentId],
    feedbackRequestSentAt: null,
  };
}

export async function listStandaloneStoreOrdersForProduction(
  admin: SupabaseClient
): Promise<StandaloneStoreOrderRow[]> {
  const { data, error } = await admin
    .from('payments')
    .select(
      `
      id,
      user_id,
      amount_cents,
      paid_at,
      created_at,
      status,
      status_detail,
      profiles(full_name, display_name, email)
    `
    )
    .eq('status', 'approved')
    .is('subscription_id', null)
    .ilike('status_detail', '%store_order%')
    .order('paid_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[admin] listStandaloneStoreOrders:', error.message);
    return [];
  }

  const addressIds = new Set<string>();
  const parsedRows: Array<{
    paymentId: string;
    userId: string;
    amountCents: number;
    paidAt: string | null;
    createdAt: string | null;
    meta: StoreOrderMeta;
    profile: Record<string, unknown> | null;
  }> = [];

  for (const row of data ?? []) {
    const meta = parseStoreOrderMeta(row.status_detail);
    if (!meta || meta.shippingMode !== 'standalone') continue;

    const userId = row.user_id as string | null;
    if (!userId) continue;

    if (meta.addressId) {
      addressIds.add(meta.addressId);
    }

    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

    parsedRows.push({
      paymentId: row.id as string,
      userId,
      amountCents: (row.amount_cents as number) ?? 0,
      paidAt: (row.paid_at as string | null) ?? null,
      createdAt: (row.created_at as string | null) ?? null,
      meta,
      profile: (profile as Record<string, unknown> | null) ?? null,
    });
  }

  const addressesById = new Map<string, Record<string, unknown>>();
  if (addressIds.size > 0) {
    const { data: addresses } = await admin
      .from('addresses')
      .select(
        'id, recipient, street, number, complement, neighborhood, city, state, zip_code'
      )
      .in('id', Array.from(addressIds));

    for (const address of addresses ?? []) {
      addressesById.set(address.id as string, address as Record<string, unknown>);
    }
  }

  return parsedRows.map((row) => {
    const address = row.meta.addressId
      ? addressesById.get(row.meta.addressId) ?? null
      : null;

    return {
      paymentId: row.paymentId,
      userId: row.userId,
      amountCents: row.amountCents,
      paidAt: row.paidAt,
      createdAt: row.createdAt,
      meta: row.meta,
      customerName:
        (row.profile?.full_name as string | null) ??
        (row.profile?.display_name as string | null) ??
        null,
      customerEmail: (row.profile?.email as string | null) ?? null,
      city: (address?.city as string | null) ?? null,
      state: (address?.state as string | null) ?? null,
      shippingAddressLine: formatProductionShippingAddress(
        address as {
          street?: string | null;
          number?: string | null;
          complement?: string | null;
          neighborhood?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          recipient?: string | null;
        } | null
      ),
      status: parseStandaloneFulfillmentStatus(row.meta),
    };
  });
}

function isRecentStandaloneForCycleBoard(
  order: StandaloneStoreOrderRow
): boolean {
  if (order.status !== 'delivered') return true;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 4);
  const anchor = order.paidAt ?? order.createdAt;
  if (!anchor) return true;
  return new Date(anchor) >= cutoff;
}

export function integrateStandaloneStoreOrdersIntoBoard(
  board: ProductionKanbanBoard,
  orders: StandaloneStoreOrderRow[],
  monthKey: string
): ProductionKanbanBoard {
  const next = cloneProductionKanbanBoard(board);

  for (const order of orders) {
    const orderMonth = standaloneOrderProductionMonthKey(order);
    if (orderMonth !== monthKey) continue;

    const mergeTarget = findMergeTargetForUser(next, order.userId);
    if (mergeTarget) {
      appendStandaloneItemsToRow(mergeTarget, order);
      continue;
    }

    const card = buildStandaloneStoreCycleRow(order);
    if (!(card.status in next)) continue;
    next[card.status as keyof ProductionKanbanBoard].push(card);
  }

  for (const status of Object.keys(next) as Array<keyof ProductionKanbanBoard>) {
    next[status].sort(compareCyclesByPurchaseOrder);
  }

  return next;
}

/** Pedidos avulsos entram no ciclo 1; se o cliente já tem card no ciclo, o item é anexado. */
export function integrateStandaloneStoreOrdersIntoCycleBoard(
  board: ProductionKanbanBoard,
  orders: StandaloneStoreOrderRow[],
  cycleNumber: number
): ProductionKanbanBoard {
  const next = cloneProductionKanbanBoard(board);

  for (const order of orders) {
    const mergeTarget = findMergeTargetForUser(next, order.userId);
    if (mergeTarget) {
      appendStandaloneItemsToRow(mergeTarget, order);
      continue;
    }

    if (cycleNumber !== 1) continue;
    if (!isRecentStandaloneForCycleBoard(order)) continue;

    const card = buildStandaloneStoreCycleRow(order);
    if (!(card.status in next)) continue;
    next[card.status as keyof ProductionKanbanBoard].push(card);
  }

  for (const status of Object.keys(next) as Array<keyof ProductionKanbanBoard>) {
    next[status].sort(compareCyclesByKitPaymentDate);
  }

  return next;
}

/** Pedidos avulsos em todas as colunas; anexa ao card do cliente se ele já está no quadro. */
export function integrateStandaloneStoreOrdersIntoOverviewBoard(
  board: ProductionKanbanBoard,
  orders: StandaloneStoreOrderRow[]
): ProductionKanbanBoard {
  const next = cloneProductionKanbanBoard(board);

  for (const order of orders) {
    const mergeTarget = findMergeTargetForUser(next, order.userId);
    if (mergeTarget) {
      appendStandaloneItemsToRow(mergeTarget, order);
      continue;
    }

    if (!isRecentStandaloneForCycleBoard(order)) continue;

    const card = buildStandaloneStoreCycleRow(order);
    if (!(card.status in next)) continue;
    next[card.status as keyof ProductionKanbanBoard].push(card);
  }

  for (const status of Object.keys(next) as Array<keyof ProductionKanbanBoard>) {
    next[status].sort(compareCyclesByKitPaymentDate);
  }

  return next;
}

export function pseudoRowsForStandaloneCycleCounts(
  orders: StandaloneStoreOrderRow[]
): AdminCycleRow[] {
  return orders
    .filter((order) => isRecentStandaloneForCycleBoard(order))
    .map((order) => buildStandaloneStoreCycleRow(order));
}

export function pseudoRowsForStandaloneMonthCounts(
  orders: StandaloneStoreOrderRow[]
): AdminCycleRow[] {
  return orders.map((order) => ({
    ...buildStandaloneStoreCycleRow(order),
    scheduledProductionMonth: standaloneOrderProductionMonthKey(order),
  }));
}

export type ActiveProductionMergeTarget =
  | { kind: 'subscription'; status: CycleStatus }
  | { kind: 'standalone'; leadPaymentId: string; status: CycleStatus };

export async function findActiveProductionMergeTargetForUser(
  admin: SupabaseClient,
  userId: string
): Promise<ActiveProductionMergeTarget | null> {
  const { data: subscriptions } = await admin
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId);

  const subIds = (subscriptions ?? []).map((row) => row.id as string);
  if (subIds.length > 0) {
    const { data: subCycles } = await admin
      .from('subscription_cycles')
      .select('status')
      .in('subscription_id', subIds)
      .in('status', ['upcoming', 'production'])
      .limit(1);

    const subCycle = subCycles?.[0];
    if (subCycle) {
      const status = parseCycleStatus(subCycle.status as string);
      if (status) {
        return { kind: 'subscription', status };
      }
    }
  }

  const standaloneOrders = await listStandaloneStoreOrdersForProduction(admin);
  const active = standaloneOrders.find(
    (order) =>
      order.userId === userId &&
      (order.status === 'upcoming' || order.status === 'production')
  );
  if (!active) return null;

  return {
    kind: 'standalone',
    leadPaymentId: active.meta.productionGroupId ?? active.paymentId,
    status: active.status,
  };
}

export async function resolveStandalonePaymentIdsForCard(
  admin: SupabaseClient,
  leadPaymentId: string
): Promise<string[]> {
  const orders = await listStandaloneStoreOrdersForProduction(admin);
  const ids = new Set<string>([leadPaymentId]);

  for (const order of orders) {
    const groupId = order.meta.productionGroupId ?? order.paymentId;
    if (groupId === leadPaymentId) {
      ids.add(order.paymentId);
    }
  }

  return Array.from(ids);
}

function standaloneMetaRollbackClears(
  target: CycleStatus
): Partial<StoreOrderMeta> {
  const targetIndex = PRODUCTION_PIPELINE.indexOf(target);
  const clears: Partial<StoreOrderMeta> = {};

  if (target === 'upcoming' || targetIndex >= 0) {
    if (
      targetIndex < 0 ||
      targetIndex < PRODUCTION_PIPELINE.indexOf('shipped')
    ) {
      clears.trackingCode = null;
      clears.carrier = null;
      clears.shippedAt = null;
      clears.shippingCostCents = null;
    }
    if (
      targetIndex < 0 ||
      targetIndex < PRODUCTION_PIPELINE.indexOf('delivered')
    ) {
      clears.deliveredAt = null;
    }
  }

  return clears;
}

export async function advanceStandaloneStoreOrders(
  admin: SupabaseClient,
  cardId: string,
  targetStatus: CycleStatus,
  formData?: FormData
): Promise<{ error: string } | { success: true; emailWarning?: string }> {
  const leadPaymentId = parseStandaloneStorePaymentId(cardId);
  if (!leadPaymentId) {
    return { error: 'Pedido avulso inválido.' };
  }

  const lead = await readStoreOrderPaymentMeta(admin, leadPaymentId);
  if (!lead) {
    return { error: 'Pedido avulso não encontrado.' };
  }

  const currentStatus = parseStandaloneFulfillmentStatus(lead.meta);
  if (!canTransitionCycle(currentStatus, targetStatus)) {
    return {
      error: cycleTransitionErrorMessage(currentStatus, targetStatus),
    };
  }

  const paymentIds = await resolveStandalonePaymentIdsForCard(
    admin,
    leadPaymentId
  );
  const now = new Date().toISOString();
  const isRollback = isCycleRollbackTransition(currentStatus, targetStatus);
  const isReopen = isCycleReopenTransition(currentStatus, targetStatus);

  const patch: Partial<StoreOrderMeta> = {
    fulfillmentStatus: targetStatus,
  };

  if (isRollback || isReopen) {
    Object.assign(patch, standaloneMetaRollbackClears(targetStatus));
  }

  if (targetStatus === 'delivered') {
    patch.deliveredAt = now;
  }

  if (targetStatus === 'preparing') {
    const notes = (formData?.get('production_notes') as string | undefined)?.trim();
    if (notes) {
      patch.productionNotes = notes;
    }
  }

  for (const paymentId of paymentIds) {
    const updated = await updateStandaloneStoreOrderMeta(admin, paymentId, patch);
    if (!updated) {
      return { error: 'Falha ao atualizar pedido avulso.' };
    }
  }

  if (!isRollback && !isReopen) {
    const cancelReason =
      targetStatus === 'cancelled'
        ? (formData?.get('cancel_reason') as string | undefined)?.trim() ||
          null
        : null;

    const notify = await notifyStandaloneStoreFulfillmentStatus(
      admin,
      leadPaymentId,
      targetStatus,
      {
        trackingCode: patch.trackingCode ?? lead.meta.trackingCode,
        carrier: patch.carrier ?? lead.meta.carrier,
        cancelReason,
      }
    );

    if (!notify.sent) {
      console.warn(
        '[admin] standalone store status email not sent:',
        targetStatus,
        notify.reason
      );
      return {
        success: true,
        emailWarning:
          notify.reason === 'missing_email'
            ? 'Cliente sem e-mail cadastrado.'
            : notify.reason === 'not_configured'
              ? 'Resend/remetente não configurado no servidor.'
              : notify.reason === 'provider_error'
                ? 'Falha ao enviar pelo Resend.'
                : `Status salvo, mas o e-mail não foi enviado (${notify.reason ?? 'erro'}).`,
      };
    }
  }

  return { success: true };
}

export async function getStandaloneStoreOrderDetail(
  admin: SupabaseClient,
  cardId: string
): Promise<AdminCycleDetailView | null> {
  const leadPaymentId = parseStandaloneStorePaymentId(cardId);
  if (!leadPaymentId) return null;

  const paymentIds = await resolveStandalonePaymentIdsForCard(
    admin,
    leadPaymentId
  );

  const { data: payments } = await admin
    .from('payments')
    .select(
      `
      id,
      user_id,
      amount_cents,
      paid_at,
      created_at,
      status_detail,
      profiles(full_name, display_name, email, phone, cpf)
    `
    )
    .in('id', paymentIds);

  if (!payments?.length) return null;

  const leadRow =
    payments.find((row) => row.id === leadPaymentId) ?? payments[0];
  const leadMeta = parseStoreOrderMeta(leadRow.status_detail);
  if (!leadMeta || leadMeta.shippingMode !== 'standalone') return null;

  let totalCents = 0;
  const extraItems: AdminCycleExtraItem[] = [];
  const seenItemIds = new Set<string>();
  const storeOrderPurchases = [];

  for (const row of payments) {
    const meta = parseStoreOrderMeta(row.status_detail);
    if (!meta) continue;
    totalCents += (row.amount_cents as number) ?? 0;
    storeOrderPurchases.push(
      storeOrderPurchaseFromMeta(
        row.id as string,
        meta,
        (row.amount_cents as number) ?? 0
      )
    );
    for (const item of storeOrderMetaToExtraItems(meta, false)) {
      if (!seenItemIds.has(item.id)) {
        extraItems.push(item);
        seenItemIds.add(item.id);
      }
    }
  }

  const profile = Array.isArray(leadRow.profiles)
    ? leadRow.profiles[0]
    : leadRow.profiles;

  let orderAddress = null;
  if (leadMeta.addressId) {
    const { data: address } = await admin
      .from('addresses')
      .select(
        'recipient, label, street, number, complement, neighborhood, city, state, zip_code'
      )
      .eq('id', leadMeta.addressId)
      .maybeSingle();

    if (address) {
      orderAddress = {
        recipient: address.recipient as string,
        label: (address.label as string | null) ?? null,
        street: address.street as string,
        number: address.number as string,
        complement: (address.complement as string | null) ?? null,
        neighborhood: address.neighborhood as string,
        city: address.city as string,
        state: address.state as string,
        zipCode: formatZip(address.zip_code as string),
        formattedMultiline: formatProductionShippingAddress(address) ?? '',
      };
    }
  }

  return toStandaloneStoreOrderDetailView({
    paymentId: leadPaymentId,
    status: parseStandaloneFulfillmentStatus(leadMeta),
    amountCents: totalCents,
    paidAt: (leadRow.paid_at as string | null) ?? null,
    createdAt: (leadRow.created_at as string | null) ?? null,
    meta: leadMeta,
    customerName:
      (profile?.full_name as string | null) ??
      (profile?.display_name as string | null) ??
      null,
    customerEmail: (profile?.email as string | null) ?? null,
    customerPhone: (profile?.phone as string | null) ?? null,
    customerCpf: (profile?.cpf as string | null) ?? null,
    userId: leadRow.user_id as string,
    shipmentItems: extraItems.map((item) => ({
      id: item.id,
      kind:
        item.kind === 'paint-kit'
          ? 'paint-kit'
          : item.kind === 'monthly-kit'
            ? 'monthly-kit'
            : 'store',
      name: item.name,
      tag: item.tag,
      quantity: item.quantity,
      detail: null,
      source: item.source,
      paymentPending: item.paymentPending,
      planSlug: null,
    })),
    orderAddress,
    storeOrderPurchases: await enrichStoreOrderPurchaseViews(
      admin,
      storeOrderPurchases
    ),
  });
}

export async function shipStandaloneStoreOrder(
  admin: SupabaseClient,
  cardId: string,
  trackingCode: string,
  carrier: string,
  shippingCostCents: number
): Promise<{ error: string } | { success: true; emailWarning?: string }> {
  const leadPaymentId = parseStandaloneStorePaymentId(cardId);
  if (!leadPaymentId) {
    return { error: 'Pedido avulso inválido.' };
  }

  const lead = await readStoreOrderPaymentMeta(admin, leadPaymentId);
  if (!lead) {
    return { error: 'Pedido avulso não encontrado.' };
  }

  const currentStatus = parseStandaloneFulfillmentStatus(lead.meta);
  if (!canTransitionCycle(currentStatus, 'shipped')) {
    return { error: 'Só é possível enviar pedidos aguardando coleta.' };
  }

  const paymentIds = await resolveStandalonePaymentIdsForCard(
    admin,
    leadPaymentId
  );
  const now = new Date().toISOString();
  const patch: Partial<StoreOrderMeta> = {
    fulfillmentStatus: 'shipped',
    trackingCode,
    carrier,
    shippingCostCents,
    shippedAt: now,
  };

  for (const paymentId of paymentIds) {
    const updated = await updateStandaloneStoreOrderMeta(admin, paymentId, patch);
    if (!updated) {
      return { error: 'Falha ao registrar envio do pedido avulso.' };
    }
  }

  const notify = await notifyStandaloneStoreFulfillmentStatus(
    admin,
    leadPaymentId,
    'shipped',
    {
      trackingCode,
      carrier,
    }
  );

  if (!notify.sent) {
    console.warn('[admin] standalone store ship email not sent:', notify.reason);
    return {
      success: true,
      emailWarning:
        notify.reason === 'missing_email'
          ? 'Cliente sem e-mail cadastrado.'
          : notify.reason === 'not_configured'
            ? 'Resend/remetente não configurado no servidor.'
            : notify.reason === 'provider_error'
              ? 'Falha ao enviar pelo Resend.'
              : `Envio registrado, mas o e-mail não foi enviado (${notify.reason ?? 'erro'}).`,
    };
  }

  return { success: true };
}
