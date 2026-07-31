import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createAdminNotification,
  type AdminNotificationType,
} from '@/lib/admin/notifications';
import { adminNotificationDefaultTitle } from '@/lib/admin/notification-display';
import { formatMoney } from '@/lib/dashboard/format';
import {
  parseStoreOrderMeta,
  type StoreOrderMeta,
} from '@/lib/asaas/store-order-payment';

function describeOrderItems(meta: StoreOrderMeta): string {
  if (!meta.items.length) return 'Pedido da loja';
  return meta.items
    .map((line) =>
      line.quantity > 1 ? `${line.name} ×${line.quantity}` : line.name
    )
    .join(', ');
}

function formatPaymentMethodLabel(method?: string | null): string {
  if (!method) return '—';
  if (method === 'credit_card') return 'Cartão';
  if (method === 'pix') return 'PIX';
  return method;
}

function formatGatewayLabel(gateway?: string | null): string {
  if (gateway === 'pagarme') return 'Pagar.me';
  if (gateway === 'asaas') return 'Asaas';
  return gateway ?? '—';
}

function notificationTitle(type: AdminNotificationType): string {
  return adminNotificationDefaultTitle(type);
}

export async function notifyAdminStoreOrderPayment(
  admin: SupabaseClient,
  input: {
    type: AdminNotificationType;
    paymentId: string;
    userId: string;
    orderMeta: StoreOrderMeta;
    amountCents?: number | null;
    paymentMethod?: string | null;
    detail?: string | null;
  }
): Promise<void> {
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, display_name, email')
    .eq('id', input.userId)
    .maybeSingle();

  const customerLabel =
    profile?.display_name?.trim() ||
    profile?.full_name?.trim() ||
    profile?.email?.trim() ||
    'Cliente';

  const itemsSummary = describeOrderItems(input.orderMeta);
  const amountLabel =
    input.amountCents != null ? formatMoney(input.amountCents) : null;
  const gateway = input.orderMeta.gateway ?? null;
  const methodLabel = formatPaymentMethodLabel(input.paymentMethod);

  const bodyParts = [
    customerLabel,
    itemsSummary,
    amountLabel,
    `${methodLabel} · ${formatGatewayLabel(gateway)}`,
  ].filter(Boolean);

  if (input.type === 'store_order_payment_failed' && input.detail?.trim()) {
    bodyParts.push(input.detail.trim());
  }

  await createAdminNotification(admin, {
    type: input.type,
    paymentId: input.paymentId,
    orderId: input.orderMeta.orderId,
    userId: input.userId,
    title: notificationTitle(input.type),
    body: bodyParts.join(' · '),
    amountCents: input.amountCents ?? null,
    paymentMethod: input.paymentMethod ?? null,
    gateway,
    metadata: {
      category: 'store',
      itemsSummary,
      customerEmail: profile?.email ?? null,
      customerName: customerLabel,
      ...(input.detail ? { paymentError: input.detail } : {}),
    },
  });
}

export async function notifyAdminStoreOrderPaymentFromPaymentRow(
  admin: SupabaseClient,
  input: {
    type: AdminNotificationType;
    paymentId: string;
    userId: string;
    statusDetail: unknown;
    amountCents?: number | null;
    paymentMethod?: string | null;
    detail?: string | null;
  }
): Promise<void> {
  const meta = parseStoreOrderMeta(input.statusDetail);
  if (!meta) return;

  await notifyAdminStoreOrderPayment(admin, {
    type: input.type,
    paymentId: input.paymentId,
    userId: input.userId,
    orderMeta: meta,
    amountCents: input.amountCents,
    paymentMethod: input.paymentMethod,
    detail: input.detail,
  });
}
