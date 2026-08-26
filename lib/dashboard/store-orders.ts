import type { SupabaseClient } from '@supabase/supabase-js';
import { formatProductionShippingAddress } from '@/lib/admin/production-list';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  enrichStoreOrderPurchaseViews,
  storeOrderPurchaseFromMeta,
  type AdminStoreOrderPurchaseView,
} from '@/lib/admin/store-order-lines';
import {
  countAdminStoreOrdersByStatus,
  formatStoreOrderShippingLabel,
  listAdminStoreOrders,
  STORE_ORDER_TAB_STATUSES,
  type AdminStoreOrderFulfillmentStatus,
  type AdminStoreOrderListRow,
  type AdminStoreOrderStatusCounts,
} from '@/lib/admin/store-orders';
import { formatPaymentMethod } from '@/lib/dashboard/payment-description';
import type { PaymentStatus } from '@/lib/dashboard/types';
import {
  findStoreOrderPaymentRow,
  parseStoreOrderMeta,
} from '@/lib/asaas/store-order-payment';
import { cycleStatusLabel } from '@/lib/subscriptions/cycle-production';

export type DashboardStoreOrderListRow = Omit<
  AdminStoreOrderListRow,
  'customerName' | 'customerEmail' | 'userId'
>;

export type DashboardStoreOrderDetail = {
  orderId: string;
  paymentId: string;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: AdminStoreOrderFulfillmentStatus;
  shippingMode: AdminStoreOrderListRow['shippingMode'];
  amountCents: number;
  paidAt: string | null;
  createdAt: string | null;
  itemsSummary: string;
  trackingCode: string | null;
  carrier: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cycleNumber: number | null;
  paymentMethod: string;
  addressLine: string | null;
  purchaseView: AdminStoreOrderPurchaseView;
};

export {
  formatStoreOrderShippingLabel,
  STORE_ORDER_TAB_STATUSES as DASHBOARD_STORE_ORDER_TAB_STATUSES,
};
export type { AdminStoreOrderStatusCounts as DashboardStoreOrderStatusCounts };

export function countDashboardStoreOrdersByStatus(
  rows: DashboardStoreOrderListRow[]
): AdminStoreOrderStatusCounts {
  return countAdminStoreOrdersByStatus(
    rows.map((row) => ({
      ...row,
      customerName: null,
      customerEmail: null,
      userId: '',
    }))
  );
}

export function formatStoreOrderFulfillmentLabel(
  fulfillmentStatus: AdminStoreOrderFulfillmentStatus
): string {
  if (fulfillmentStatus === 'pending_payment') {
    return 'Aguardando pagamento';
  }
  return cycleStatusLabel(fulfillmentStatus);
}

function toDashboardListRow(row: AdminStoreOrderListRow): DashboardStoreOrderListRow {
  const { customerName: _n, customerEmail: _e, userId: _u, ...rest } = row;
  return rest;
}

export async function listDashboardStoreOrders(
  _supabase: SupabaseClient,
  userId: string,
  options?: {
    q?: string;
    status?: string;
    shipping?: 'standalone' | 'bundled' | '';
    limit?: number;
  }
): Promise<DashboardStoreOrderListRow[]> {
  const admin = createAdminClient();
  const rows = await listAdminStoreOrders(admin, {
    ...options,
    userId,
  });
  return rows.map(toDashboardListRow);
}

export async function getDashboardStoreOrderDetail(
  supabase: SupabaseClient,
  userId: string,
  orderId: string
): Promise<DashboardStoreOrderDetail | null> {
  const admin = createAdminClient();
  const paymentRow = await findStoreOrderPaymentRow(admin, userId, orderId);
  if (!paymentRow) return null;

  const meta = parseStoreOrderMeta(paymentRow.status_detail);
  if (!meta) return null;

  const listRows = await listDashboardStoreOrders(supabase, userId, { limit: 200 });
  const listRow = listRows.find((row) => row.orderId === orderId);
  if (!listRow) return null;

  let addressLine: string | null = null;
  if (meta.addressId) {
    const { data: address } = await supabase
      .from('addresses')
      .select(
        'recipient, street, number, complement, neighborhood, city, state, zip_code'
      )
      .eq('id', meta.addressId)
      .eq('user_id', userId)
      .maybeSingle();

    if (address) {
      addressLine = formatProductionShippingAddress(address);
    }
  }

  const purchaseView = storeOrderPurchaseFromMeta(
    paymentRow.id,
    meta,
    (paymentRow.amount_cents as number) ?? 0
  );

  const [enrichedPurchase] = await enrichStoreOrderPurchaseViews(supabase, [
    purchaseView,
  ]);

  return {
    orderId: meta.orderId,
    paymentId: paymentRow.id,
    paymentStatus: paymentRow.status as PaymentStatus,
    fulfillmentStatus: listRow.fulfillmentStatus,
    shippingMode: listRow.shippingMode,
    amountCents: listRow.amountCents,
    paidAt: listRow.paidAt,
    createdAt: listRow.createdAt,
    itemsSummary: listRow.itemsSummary,
    trackingCode: listRow.trackingCode,
    carrier: listRow.carrier,
    shippedAt: meta.shippedAt ?? null,
    deliveredAt: meta.deliveredAt ?? null,
    cycleNumber: listRow.cycleNumber,
    paymentMethod: formatPaymentMethod(paymentRow.payment_method),
    addressLine,
    purchaseView: enrichedPurchase!,
  };
}
