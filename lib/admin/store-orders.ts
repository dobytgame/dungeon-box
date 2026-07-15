import type { SupabaseClient } from '@supabase/supabase-js';
import {
  assignStoreOrderToCycle,
  listSiblingCyclesForShipment,
  type CycleShipmentContext,
  type StoreOrderPaymentRow,
} from '@/lib/admin/cycle-shipment-items';
import { formatProductionShippingAddress } from '@/lib/admin/production-list';
import {
  getStandaloneStoreOrderDetail,
  standaloneStoreCardId,
} from '@/lib/admin/standalone-store-production';
import type { AdminCycleDetailView } from '@/lib/admin/cycle-detail-view';
import { relOne } from '@/lib/dashboard/format';
import type { CycleStatus, PaymentStatus } from '@/lib/dashboard/types';
import {
  parseStandaloneFulfillmentStatus,
  parseStoreOrderMeta,
  type StoreOrderMeta,
} from '@/lib/asaas/store-order-payment';
import { parseCycleStatus } from '@/lib/subscriptions/cycle-production';

export type AdminStoreOrderFulfillmentStatus = CycleStatus | 'pending_payment';

export type AdminStoreOrderListRow = {
  id: string;
  paymentId: string;
  orderId: string;
  paymentStatus: PaymentStatus;
  shippingMode: 'standalone' | 'with_subscription';
  fulfillmentStatus: AdminStoreOrderFulfillmentStatus;
  customerName: string | null;
  customerEmail: string | null;
  itemsSummary: string;
  amountCents: number;
  paidAt: string | null;
  createdAt: string | null;
  city: string | null;
  state: string | null;
  trackingCode: string | null;
  carrier: string | null;
  cycleId: string | null;
  cycleNumber: number | null;
  subscriptionId: string | null;
  userId: string;
};

export type AdminStoreOrderStatusCounts = {
  all: number;
  pending_payment: number;
  upcoming: number;
  production: number;
  preparing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
};

export const STORE_ORDER_TAB_STATUSES: Array<{
  value: AdminStoreOrderFulfillmentStatus | 'all';
  label: string;
}> = [
  { value: 'pending_payment', label: 'Aguardando pagamento' },
  { value: 'upcoming', label: 'Aguardando' },
  { value: 'production', label: 'Produção' },
  { value: 'preparing', label: 'Em preparo' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'all', label: 'Todos' },
];

function describeOrderItems(meta: StoreOrderMeta): string {
  if (!meta.items.length) return 'Pedido da loja';
  return meta.items
    .map((line) =>
      line.quantity > 1 ? `${line.name} ×${line.quantity}` : line.name
    )
    .join(', ');
}

function resolveBundledSubscriptionId(meta: StoreOrderMeta): string | null {
  if (meta.bundleSubscriptionId) return meta.bundleSubscriptionId;
  for (const line of meta.items) {
    if (line.bundleSubscriptionId) return line.bundleSubscriptionId;
  }
  return null;
}

function isBundledStoreMeta(
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

function toStoreOrderPaymentRow(
  row: Record<string, unknown>,
  meta: StoreOrderMeta
): StoreOrderPaymentRow {
  return {
    id: row.id as string,
    amount_cents: (row.amount_cents as number) ?? 0,
    paid_at: (row.paid_at as string | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
    meta,
    paymentStatus: row.status === 'approved' ? 'approved' : 'pending',
  };
}

function matchesSearch(
  row: AdminStoreOrderListRow,
  query: string | undefined
): boolean {
  if (!query?.trim()) return true;
  const needle = query.trim().toLowerCase();
  return (
    row.orderId.toLowerCase().includes(needle) ||
    row.paymentId.toLowerCase().includes(needle) ||
    (row.customerName?.toLowerCase().includes(needle) ?? false) ||
    (row.customerEmail?.toLowerCase().includes(needle) ?? false) ||
    row.itemsSummary.toLowerCase().includes(needle) ||
    (row.trackingCode?.toLowerCase().includes(needle) ?? false)
  );
}

export function countAdminStoreOrdersByStatus(
  rows: AdminStoreOrderListRow[]
): AdminStoreOrderStatusCounts {
  const counts: AdminStoreOrderStatusCounts = {
    all: rows.length,
    pending_payment: 0,
    upcoming: 0,
    production: 0,
    preparing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };

  for (const row of rows) {
    const key = row.fulfillmentStatus;
    if (key in counts) {
      counts[key as keyof Omit<AdminStoreOrderStatusCounts, 'all'>] += 1;
    }
  }

  return counts;
}

export async function listAdminStoreOrders(
  admin: SupabaseClient,
  options?: {
    q?: string;
    status?: string;
    shipping?: 'standalone' | 'bundled' | '';
    limit?: number;
  }
): Promise<AdminStoreOrderListRow[]> {
  const limit = options?.limit ?? 200;

  const { data, error } = await admin
    .from('payments')
    .select(
      `
      id,
      user_id,
      subscription_id,
      amount_cents,
      paid_at,
      created_at,
      status,
      status_detail,
      profiles(full_name, display_name, email)
    `
    )
    .ilike('status_detail', '%store_order%')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[admin] listAdminStoreOrders:', error.message);
    return [];
  }

  const parsed: Array<{
    paymentId: string;
    userId: string;
    subscriptionId: string | null;
    paymentStatus: PaymentStatus;
    amountCents: number;
    paidAt: string | null;
    createdAt: string | null;
    meta: StoreOrderMeta;
    profile: Record<string, unknown> | null;
    addressId: string | null;
    bundledSubscriptionId: string | null;
    isBundled: boolean;
  }> = [];

  const bundledSubscriptionIds = new Set<string>();
  const addressIds = new Set<string>();

  for (const row of data ?? []) {
    const meta = parseStoreOrderMeta(row.status_detail);
    if (!meta) continue;

    const userId = row.user_id as string | null;
    if (!userId) continue;

    const paymentSubscriptionId = (row.subscription_id as string | null) ?? null;
    const bundled = isBundledStoreMeta(meta, paymentSubscriptionId);
    const bundledSubscriptionId =
      resolveBundledSubscriptionId(meta) ?? paymentSubscriptionId;

    if (bundled && bundledSubscriptionId) {
      bundledSubscriptionIds.add(bundledSubscriptionId);
    }

    if (meta.addressId) {
      addressIds.add(meta.addressId);
    }

    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

    parsed.push({
      paymentId: row.id as string,
      userId,
      subscriptionId: paymentSubscriptionId,
      paymentStatus: row.status as PaymentStatus,
      amountCents: (row.amount_cents as number) ?? 0,
      paidAt: (row.paid_at as string | null) ?? null,
      createdAt: (row.created_at as string | null) ?? null,
      meta,
      profile: (profile as Record<string, unknown> | null) ?? null,
      addressId: meta.addressId ?? null,
      bundledSubscriptionId,
      isBundled: bundled,
    });
  }

  const addressesById = new Map<string, Record<string, unknown>>();
  if (addressIds.size > 0) {
    const { data: addresses } = await admin
      .from('addresses')
      .select('id, city, state')
      .in('id', Array.from(addressIds));

    for (const address of addresses ?? []) {
      addressesById.set(address.id as string, address as Record<string, unknown>);
    }
  }

  const cyclesBySubscription = new Map<string, CycleShipmentContext[]>();
  if (bundledSubscriptionIds.size > 0) {
    const { data: cycleRows } = await admin
      .from('subscription_cycles')
      .select('id, cycle_number, subscription_id, status, paid_at, created_at')
      .in('subscription_id', Array.from(bundledSubscriptionIds))
      .order('cycle_number', { ascending: true });

    for (const cycle of cycleRows ?? []) {
      const subscriptionId = cycle.subscription_id as string;
      const bucket = cyclesBySubscription.get(subscriptionId) ?? [];
      bucket.push({
        cycleId: cycle.id as string,
        cycleNumber: cycle.cycle_number as number,
        subscriptionId,
        status: parseCycleStatus(cycle.status as string) ?? 'upcoming',
        paidAt: (cycle.paid_at as string | null) ?? null,
        createdAt: (cycle.created_at as string | null) ?? null,
      });
      cyclesBySubscription.set(subscriptionId, bucket);
    }
  }

  const rows: AdminStoreOrderListRow[] = parsed.map((entry) => {
    const address = entry.addressId
      ? addressesById.get(entry.addressId) ?? null
      : null;

    let fulfillmentStatus: AdminStoreOrderFulfillmentStatus = 'pending_payment';
    let cycleId: string | null = null;
    let cycleNumber: number | null = null;

    if (entry.paymentStatus !== 'approved') {
      fulfillmentStatus = 'pending_payment';
    } else if (entry.isBundled && entry.bundledSubscriptionId) {
      const siblingCycles =
        cyclesBySubscription.get(entry.bundledSubscriptionId) ?? [];
      const assigned = assignStoreOrderToCycle(
        toStoreOrderPaymentRow(
          {
            id: entry.paymentId,
            amount_cents: entry.amountCents,
            paid_at: entry.paidAt,
            created_at: entry.createdAt,
            status: entry.paymentStatus,
          },
          entry.meta
        ),
        siblingCycles
      );
      if (assigned) {
        cycleId = assigned.cycleId;
        cycleNumber = assigned.cycleNumber;
        fulfillmentStatus = assigned.status;
      } else {
        fulfillmentStatus = 'upcoming';
      }
    } else {
      fulfillmentStatus = parseStandaloneFulfillmentStatus(entry.meta);
      cycleId = null;
      cycleNumber = null;
    }

    return {
      id: entry.paymentId,
      paymentId: entry.paymentId,
      orderId: entry.meta.orderId,
      paymentStatus: entry.paymentStatus,
      shippingMode: entry.isBundled ? 'with_subscription' : 'standalone',
      fulfillmentStatus,
      customerName:
        (entry.profile?.full_name as string | null) ??
        (entry.profile?.display_name as string | null) ??
        null,
      customerEmail: (entry.profile?.email as string | null) ?? null,
      itemsSummary: describeOrderItems(entry.meta),
      amountCents: entry.amountCents,
      paidAt: entry.paidAt,
      createdAt: entry.createdAt,
      city: (address?.city as string | null) ?? null,
      state: (address?.state as string | null) ?? null,
      trackingCode: entry.meta.trackingCode ?? null,
      carrier: entry.meta.carrier ?? null,
      cycleId,
      cycleNumber,
      subscriptionId: entry.bundledSubscriptionId,
      userId: entry.userId,
    };
  });

  return rows.filter((row) => {
    if (options?.shipping === 'standalone' && row.shippingMode !== 'standalone') {
      return false;
    }
    if (options?.shipping === 'bundled' && row.shippingMode !== 'with_subscription') {
      return false;
    }
    if (
      options?.status &&
      options.status !== 'all' &&
      row.fulfillmentStatus !== options.status
    ) {
      return false;
    }
    return matchesSearch(row, options?.q);
  });
}

export type AdminStoreOrderDetail =
  | {
      kind: 'standalone';
      paymentId: string;
      cardId: string;
      detail: AdminCycleDetailView;
    }
  | {
      kind: 'bundled';
      paymentId: string;
      orderId: string;
      paymentStatus: PaymentStatus;
      amountCents: number;
      paidAt: string | null;
      createdAt: string | null;
      meta: StoreOrderMeta;
      customerName: string | null;
      customerEmail: string | null;
      customerPhone: string | null;
      userId: string;
      subscriptionId: string | null;
      cycleId: string | null;
      cycleNumber: number | null;
      cycleStatus: CycleStatus | null;
      itemsSummary: string;
      addressLine: string | null;
    };

export async function getAdminStoreOrderDetail(
  admin: SupabaseClient,
  paymentId: string
): Promise<AdminStoreOrderDetail | null> {
  const { data: payment } = await admin
    .from('payments')
    .select(
      `
      id,
      user_id,
      subscription_id,
      amount_cents,
      paid_at,
      created_at,
      status,
      status_detail,
      profiles(full_name, display_name, email, phone)
    `
    )
    .eq('id', paymentId)
    .maybeSingle();

  if (!payment) return null;

  const meta = parseStoreOrderMeta(payment.status_detail);
  if (!meta) return null;

  const paymentSubscriptionId = (payment.subscription_id as string | null) ?? null;
  const bundled = isBundledStoreMeta(meta, paymentSubscriptionId);

  if (!bundled) {
    const detail = await getStandaloneStoreOrderDetail(
      admin,
      standaloneStoreCardId(paymentId)
    );
    if (!detail) return null;

    return {
      kind: 'standalone',
      paymentId,
      cardId: standaloneStoreCardId(paymentId),
      detail,
    };
  }

  const profile = relOne(
    payment.profiles as
      | { full_name?: string | null; display_name?: string | null; email?: string | null; phone?: string | null }
      | Array<{
          full_name?: string | null;
          display_name?: string | null;
          email?: string | null;
          phone?: string | null;
        }>
      | null
  );

  const bundledSubscriptionId =
    resolveBundledSubscriptionId(meta) ?? paymentSubscriptionId;

  let cycleId: string | null = null;
  let cycleNumber: number | null = null;
  let cycleStatus: CycleStatus | null = null;

  if (bundledSubscriptionId && payment.status === 'approved') {
    const siblingCycles = await listSiblingCyclesForShipment(
      admin,
      bundledSubscriptionId
    );
    const assigned = assignStoreOrderToCycle(
      toStoreOrderPaymentRow(payment as Record<string, unknown>, meta),
      siblingCycles
    );
    if (assigned) {
      cycleId = assigned.cycleId;
      cycleNumber = assigned.cycleNumber;
      cycleStatus = assigned.status;
    }
  }

  let addressLine: string | null = null;
  if (meta.addressId) {
    const { data: address } = await admin
      .from('addresses')
      .select(
        'recipient, street, number, complement, neighborhood, city, state, zip_code'
      )
      .eq('id', meta.addressId)
      .maybeSingle();

    if (address) {
      addressLine = formatProductionShippingAddress(address);
    }
  }

  return {
    kind: 'bundled',
    paymentId,
    orderId: meta.orderId,
    paymentStatus: payment.status as PaymentStatus,
    amountCents: (payment.amount_cents as number) ?? 0,
    paidAt: (payment.paid_at as string | null) ?? null,
    createdAt: (payment.created_at as string | null) ?? null,
    meta,
    customerName: profile?.full_name ?? profile?.display_name ?? null,
    customerEmail: profile?.email ?? null,
    customerPhone: profile?.phone ?? null,
    userId: payment.user_id as string,
    subscriptionId: bundledSubscriptionId,
    cycleId,
    cycleNumber,
    cycleStatus,
    itemsSummary: describeOrderItems(meta),
    addressLine,
  };
}

export function formatStoreOrderShippingLabel(
  mode: AdminStoreOrderListRow['shippingMode']
): string {
  return mode === 'with_subscription' ? 'Com assinatura' : 'Avulso';
}
