import type { SupabaseClient } from '@supabase/supabase-js';
import {
  assignStoreOrderToCycle,
  listSiblingCyclesForShipment,
  type CycleShipmentContext,
} from '@/lib/admin/cycle-shipment-items';
import { formatProductionShippingAddress } from '@/lib/admin/production-list';
import type { AdminStoreOrderPurchaseView } from '@/lib/admin/store-order-lines';
import {
  parseStoreOrderMeta,
} from '@/lib/asaas/store-order-payment';
import { getPaintKitBump, type PaintKitBumpId } from '@/lib/checkout/order-bumps';
import {
  parsePaintKitBump,
  parsePaintKitBumpRecurring,
} from '@/lib/checkout/special-notes';
import { formatPaymentMethod } from '@/lib/dashboard/payment-description';
import type { PaymentStatus } from '@/lib/dashboard/types';
import { storeOrderHasPaintKit } from '@/lib/store/paint-kit-detect';
import type {
  DashboardStoreOrderDetail,
  DashboardStoreOrderListRow,
} from '@/lib/dashboard/store-orders';

export const PAINT_KIT_ADDON_ORDER_PREFIX = 'kit-pintura-';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SubscriptionPaintKitRow = {
  id: string;
  special_notes: string | null;
  address_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type AddonPaymentRow = {
  id: string;
  amount_cents: number | null;
  paid_at: string | null;
  created_at: string | null;
  status: string | null;
  payment_method: string | null;
  status_detail: string | null;
};

export function paintKitAddonOrderId(subscriptionId: string): string {
  return `${PAINT_KIT_ADDON_ORDER_PREFIX}${subscriptionId}`;
}

export function parsePaintKitAddonOrderId(orderId: string): string | null {
  if (!orderId.startsWith(PAINT_KIT_ADDON_ORDER_PREFIX)) return null;
  const subscriptionId = orderId.slice(PAINT_KIT_ADDON_ORDER_PREFIX.length).trim();
  return UUID_RE.test(subscriptionId) ? subscriptionId : null;
}

function storeOrdersCoverPaintKit(
  orders: DashboardStoreOrderListRow[],
  subscriptionId: string
): boolean {
  return orders.some((order) => {
    if (order.subscriptionId !== subscriptionId) return false;
    if (storeOrderHasPaintKit([{ name: order.itemsSummary }])) return true;
    return false;
  });
}

function pickAddonPayment(
  payments: AddonPaymentRow[],
  bumpId: PaintKitBumpId
): AddonPaymentRow | null {
  const bump = getPaintKitBump(bumpId);
  if (!bump) return null;

  return (
    payments.find(
      (row) =>
        row.status === 'approved' &&
        !parseStoreOrderMeta(row.status_detail) &&
        row.amount_cents === bump.priceCents
    ) ?? null
  );
}

function toListRow(input: {
  subscription: SubscriptionPaintKitRow;
  bumpId: PaintKitBumpId;
  payment: AddonPaymentRow | null;
  cycle: CycleShipmentContext | null;
}): DashboardStoreOrderListRow {
  const bump = getPaintKitBump(input.bumpId);
  const recurring = parsePaintKitBumpRecurring(input.subscription.special_notes);
  const amountCents =
    input.payment?.amount_cents ?? bump?.priceCents ?? 0;
  const paidAt = input.payment?.paid_at ?? input.subscription.updated_at ?? null;
  const createdAt =
    input.payment?.created_at ??
    input.subscription.updated_at ??
    input.subscription.created_at ??
    null;

  return {
    id: paintKitAddonOrderId(input.subscription.id),
    paymentId: input.payment?.id ?? paintKitAddonOrderId(input.subscription.id),
    orderId: paintKitAddonOrderId(input.subscription.id),
    paymentStatus: (input.payment?.status as PaymentStatus) ?? 'approved',
    shippingMode: 'with_subscription',
    fulfillmentStatus: input.cycle?.status ?? 'upcoming',
    itemsSummary: bump
      ? recurring
        ? `${bump.name} · recorrente`
        : `${bump.name} · envio com a caixa`
      : 'Kit de pintura extra',
    amountCents,
    paidAt,
    createdAt,
    city: null,
    state: null,
    trackingCode: null,
    carrier: null,
    cycleId: input.cycle?.cycleId ?? null,
    cycleNumber: input.cycle?.cycleNumber ?? null,
    subscriptionId: input.subscription.id,
  };
}

export async function listDashboardPaintKitAddonOrders(
  admin: SupabaseClient,
  userId: string,
  existingOrders: DashboardStoreOrderListRow[]
): Promise<DashboardStoreOrderListRow[]> {
  const { data: subscriptions } = await admin
    .from('subscriptions')
    .select('id, special_notes, address_id, created_at, updated_at')
    .eq('user_id', userId);

  const withPaintKit = ((subscriptions ?? []) as SubscriptionPaintKitRow[]).filter(
    (subscription) => parsePaintKitBump(subscription.special_notes)
  );

  if (withPaintKit.length === 0) return [];

  const rows: DashboardStoreOrderListRow[] = [];

  for (const subscription of withPaintKit) {
    const bumpId = parsePaintKitBump(subscription.special_notes);
    if (!bumpId) continue;
    if (storeOrdersCoverPaintKit(existingOrders, subscription.id)) continue;

    const [{ data: payments }, siblingCycles] = await Promise.all([
      admin
        .from('payments')
        .select(
          'id, amount_cents, paid_at, created_at, status, payment_method, status_detail'
        )
        .eq('user_id', userId)
        .eq('subscription_id', subscription.id)
        .order('created_at', { ascending: false }),
      listSiblingCyclesForShipment(admin, subscription.id),
    ]);

    const payment = pickAddonPayment((payments ?? []) as AddonPaymentRow[], bumpId);
    const assigned = assignStoreOrderToCycle(
      {
        id: payment?.id ?? paintKitAddonOrderId(subscription.id),
        amount_cents: payment?.amount_cents ?? getPaintKitBump(bumpId)?.priceCents ?? 0,
        paid_at: payment?.paid_at ?? subscription.updated_at ?? null,
        created_at: payment?.created_at ?? subscription.created_at ?? null,
        meta: {
          type: 'store_order',
          orderId: paintKitAddonOrderId(subscription.id),
          paymentMethod: 'credit_card',
          items: [],
          addressId: subscription.address_id ?? '',
          bundleSubscriptionId: subscription.id,
          shippingMode: 'with_subscription',
        },
        paymentStatus: payment?.status === 'approved' ? 'approved' : 'pending',
      },
      siblingCycles
    );

    rows.push(
      toListRow({
        subscription,
        bumpId,
        payment,
        cycle: assigned,
      })
    );
  }

  return rows;
}

export async function getDashboardPaintKitAddonDetail(
  admin: SupabaseClient,
  userId: string,
  subscriptionId: string
): Promise<DashboardStoreOrderDetail | null> {
  const { data: subscription } = await admin
    .from('subscriptions')
    .select('id, special_notes, address_id, created_at, updated_at')
    .eq('id', subscriptionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!subscription) return null;

  const bumpId = parsePaintKitBump(subscription.special_notes);
  if (!bumpId) return null;

  const bump = getPaintKitBump(bumpId);
  if (!bump) return null;

  const [{ data: payments }, siblingCycles] = await Promise.all([
    admin
      .from('payments')
      .select(
        'id, amount_cents, paid_at, created_at, status, payment_method, status_detail'
      )
      .eq('user_id', userId)
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false }),
    listSiblingCyclesForShipment(admin, subscriptionId),
  ]);

  const payment = pickAddonPayment((payments ?? []) as AddonPaymentRow[], bumpId);
  const assigned = assignStoreOrderToCycle(
    {
      id: payment?.id ?? paintKitAddonOrderId(subscriptionId),
      amount_cents: payment?.amount_cents ?? bump.priceCents,
      paid_at: payment?.paid_at ?? subscription.updated_at ?? null,
      created_at: payment?.created_at ?? subscription.created_at ?? null,
      meta: {
        type: 'store_order',
        orderId: paintKitAddonOrderId(subscriptionId),
        paymentMethod: 'credit_card',
        items: [],
        addressId: subscription.address_id ?? '',
        bundleSubscriptionId: subscriptionId,
        shippingMode: 'with_subscription',
      },
      paymentStatus: payment?.status === 'approved' ? 'approved' : 'pending',
    },
    siblingCycles
  );

  const listRow = toListRow({
    subscription: subscription as SubscriptionPaintKitRow,
    bumpId,
    payment,
    cycle: assigned,
  });

  let addressLine: string | null = null;
  if (subscription.address_id) {
    const { data: address } = await admin
      .from('addresses')
      .select(
        'recipient, street, number, complement, neighborhood, city, state, zip_code'
      )
      .eq('id', subscription.address_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (address) {
      addressLine = formatProductionShippingAddress(address);
    }
  }

  const recurring = parsePaintKitBumpRecurring(subscription.special_notes);
  const purchaseView: AdminStoreOrderPurchaseView = {
    orderId: listRow.orderId,
    paymentId: listRow.paymentId,
    items: [
      {
        name: bump.name,
        quantity: 1,
        lineTotalCents: listRow.amountCents,
        detail: recurring
          ? 'Recorrente todo mês, enviado com a caixa'
          : 'Cobrança única, enviado com a próxima caixa',
      },
    ],
    amountCents: listRow.amountCents,
    shippingLabel: 'Com a assinatura',
    shippingCents: 0,
    couponCode: null,
    couponDiscountCents: null,
  };

  return {
    orderId: listRow.orderId,
    paymentId: listRow.paymentId,
    paymentStatus: listRow.paymentStatus,
    fulfillmentStatus: listRow.fulfillmentStatus,
    shippingMode: listRow.shippingMode,
    amountCents: listRow.amountCents,
    paidAt: listRow.paidAt,
    createdAt: listRow.createdAt,
    itemsSummary: listRow.itemsSummary,
    trackingCode: listRow.trackingCode,
    carrier: listRow.carrier,
    shippedAt: null,
    deliveredAt: null,
    cycleNumber: listRow.cycleNumber,
    paymentMethod: formatPaymentMethod(payment?.payment_method),
    addressLine,
    purchaseView,
  };
}

export function mergeDashboardStoreOrders(
  storeOrders: DashboardStoreOrderListRow[],
  addonOrders: DashboardStoreOrderListRow[]
): DashboardStoreOrderListRow[] {
  return [...storeOrders, ...addonOrders].sort((a, b) => {
    const aAt = a.paidAt ?? a.createdAt ?? '';
    const bAt = b.paidAt ?? b.createdAt ?? '';
    return bAt.localeCompare(aAt);
  });
}
