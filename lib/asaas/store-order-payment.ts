import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchAsaasPayment,
  fetchAsaasPixQrCode,
  type AsaasPixQrCode,
} from '@/lib/asaas/one-time-payment';
import { isAsaasPaymentConfirmed } from '@/lib/asaas/payment-status';
import type { AsaasWebhookPayment } from '@/lib/asaas/webhook-handlers';
import { setPaintKitBumpInNotes } from '@/lib/checkout/special-notes';
import {
  buildStoreOrderPurchaseAnalytics,
  type StoreOrderPurchaseAnalytics,
} from '@/lib/analytics/store-purchase';
import { getStoreProduct, type StoreCatalogProductId } from '@/lib/store/catalog';

export type StoreOrderMeta = {
  type: 'store_order';
  orderId: string;
  paymentMethod: 'credit_card' | 'pix';
  items: Array<{
    productId: string;
    kind: 'monthly-kit' | 'catalog';
    quantity: number;
    name: string;
    lineTotalCents: number;
    bundleSubscriptionId?: string | null;
    paintKitBumpId?: 'amador' | 'profissional' | null;
    [key: string]: unknown;
  }>;
  addressId: string;
  bundleSubscriptionId: string | null;
  shippingMode: 'with_subscription' | 'standalone';
};

export function buildStoreOrderExternalReference(
  userId: string,
  orderId: string
): string {
  return `store:${userId}:${orderId}`;
}

export function parseStoreOrderExternalReference(
  externalReference?: string | null
): { userId: string; orderId: string } | null {
  if (!externalReference?.startsWith('store:')) return null;

  const parts = externalReference.split(':');
  if (parts.length !== 3) return null;

  const userId = parts[1]?.trim();
  const orderId = parts[2]?.trim();
  if (!userId || !orderId) return null;

  return { userId, orderId };
}

export function parseStoreOrderMeta(raw: unknown): StoreOrderMeta | null {
  if (!raw) return null;

  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as StoreOrderMeta).type !== 'store_order'
  ) {
    return null;
  }

  return parsed as StoreOrderMeta;
}

function findPaintKitBumpInOrderMeta(
  meta: StoreOrderMeta
): { bumpId: 'amador' | 'profissional'; bundleSubscriptionId: string } | null {
  for (const item of meta.items) {
    if (item.kind !== 'catalog' || !item.bundleSubscriptionId) continue;

    const product = getStoreProduct(item.productId as StoreCatalogProductId);
    if (!product?.paintKitBumpId || item.quantity !== 1) continue;

    return {
      bumpId: product.paintKitBumpId,
      bundleSubscriptionId: item.bundleSubscriptionId,
    };
  }

  return null;
}

export async function fulfillApprovedStoreOrder(
  supabase: SupabaseClient,
  userId: string,
  meta: StoreOrderMeta
): Promise<void> {
  const paintKit = findPaintKitBumpInOrderMeta(meta);
  if (!paintKit) return;

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id, special_notes')
    .eq('id', paintKit.bundleSubscriptionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!subscription) return;

  const now = new Date().toISOString();
  await supabase
    .from('subscriptions')
    .update({
      special_notes: setPaintKitBumpInNotes(
        subscription.special_notes,
        paintKit.bumpId,
        false
      ),
      updated_at: now,
    })
    .eq('id', subscription.id)
    .eq('user_id', userId);
}

export async function approveStoreOrderPayment(
  supabase: SupabaseClient,
  asaasPaymentId: string,
  payment: Pick<AsaasWebhookPayment, 'value'>
): Promise<'processed' | 'skipped'> {
  const { data: paymentRow } = await supabase
    .from('payments')
    .select('id, user_id, status, status_detail, amount_cents')
    .eq('asaas_payment_id', asaasPaymentId)
    .maybeSingle();

  if (!paymentRow) return 'skipped';

  const meta = parseStoreOrderMeta(paymentRow.status_detail);
  if (!meta) return 'skipped';

  if (paymentRow.status === 'approved') {
    return 'processed';
  }

  const now = new Date().toISOString();
  const amountCents =
    payment.value != null
      ? Math.round(payment.value * 100)
      : paymentRow.amount_cents;

  await supabase
    .from('payments')
    .update({
      ...(amountCents != null ? { amount_cents: amountCents } : {}),
      status: 'approved',
      paid_at: now,
    })
    .eq('id', paymentRow.id);

  await fulfillApprovedStoreOrder(supabase, paymentRow.user_id, meta);

  return 'processed';
}

export async function handleStoreOrderPaymentConfirmed(
  supabase: SupabaseClient,
  payment: AsaasWebhookPayment
): Promise<'processed' | 'skipped'> {
  const reference = parseStoreOrderExternalReference(payment.externalReference);
  if (!reference) return 'skipped';

  if (!isAsaasPaymentConfirmed(payment.status)) {
    return 'skipped';
  }

  return approveStoreOrderPayment(supabase, payment.id, payment);
}

export type StoreOrderStatusResult = {
  state: 'approved' | 'pending' | 'not_found';
  pix?: AsaasPixQrCode;
  order?: StoreOrderPurchaseAnalytics;
};

function buildOrderStatusResult(
  meta: StoreOrderMeta | null,
  state: StoreOrderStatusResult['state'],
  amountCents?: number | null,
  pix?: AsaasPixQrCode
): StoreOrderStatusResult {
  const order = meta ? buildStoreOrderPurchaseAnalytics(meta, amountCents) : null;
  return {
    state,
    ...(pix ? { pix } : {}),
    ...(order ? { order } : {}),
  };
}

export async function syncStoreOrderPaymentByOrderId(
  supabase: SupabaseClient,
  userId: string,
  orderId: string
): Promise<StoreOrderStatusResult> {
  const { data: rows } = await supabase
    .from('payments')
    .select('id, status, status_detail, asaas_payment_id, amount_cents')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  const paymentRow = (rows ?? []).find((row) => {
    const meta = parseStoreOrderMeta(row.status_detail);
    return meta?.orderId === orderId;
  });

  if (!paymentRow?.asaas_payment_id) {
    return { state: 'not_found' };
  }

  const meta = parseStoreOrderMeta(paymentRow.status_detail);

  if (paymentRow.status === 'approved') {
    return buildOrderStatusResult(
      meta,
      'approved',
      paymentRow.amount_cents
    );
  }

  let remoteStatus: string | undefined;

  try {
    const remote = await fetchAsaasPayment(paymentRow.asaas_payment_id);
    remoteStatus = remote.status;

    if (isAsaasPaymentConfirmed(remote.status)) {
      await approveStoreOrderPayment(supabase, paymentRow.asaas_payment_id, remote);
      return buildOrderStatusResult(meta, 'approved', paymentRow.amount_cents);
    }
  } catch (error) {
    console.error('[store] sync payment status:', error);
  }

  if (meta?.paymentMethod === 'pix') {
    try {
      const pix = await fetchAsaasPixQrCode(paymentRow.asaas_payment_id);
      return buildOrderStatusResult(
        meta,
        isAsaasPaymentConfirmed(remoteStatus) ? 'approved' : 'pending',
        paymentRow.amount_cents,
        pix
      );
    } catch (error) {
      console.error('[store] fetch pix qr code:', error);
    }
  }

  return buildOrderStatusResult(meta, 'pending', paymentRow.amount_cents);
}
