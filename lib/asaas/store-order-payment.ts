import type { SupabaseClient } from '@supabase/supabase-js';
import { asaasRequest } from '@/lib/asaas/client';
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
import { inferPlanSlugFromText } from '@/lib/store/plan-slug-infer';
import { sendStoreOrderConfirmedEmail } from '@/lib/email/send-transactional';

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
  subtotalCents?: number;
  shippingCents?: number;
  shippingLabel?: string | null;
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
  for (let depth = 0; depth < 2; depth += 1) {
    if (typeof parsed !== 'string') break;
    try {
      parsed = JSON.parse(parsed);
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

  const meta = parsed as StoreOrderMeta;
  if (!Array.isArray(meta.items)) {
    meta.items = [];
  }

  return meta;
}

type AsaasCustomerPayment = {
  id: string;
  subscription?: string | { id?: string } | null;
  externalReference?: string | null;
  description?: string | null;
  value?: number;
  status?: string;
  paymentDate?: string | null;
  billingType?: string;
};

export async function listAsaasCustomerPayments(
  customerId: string
): Promise<AsaasCustomerPayment[]> {
  const response = await asaasRequest<{ data?: AsaasCustomerPayment[] }>(
    `/payments?customer=${encodeURIComponent(customerId)}&limit=100`
  );
  return response.data ?? [];
}

function parseStoreItemFromAsaasDescription(description: string): {
  name: string;
  quantity: number;
  kind: 'monthly-kit' | 'catalog';
  productId: string;
  planSlug: string | null;
  planName: string | null;
} {
  const qtyMatch = description.match(/(\d+)x\s/i);
  const quantity = qtyMatch ? Number.parseInt(qtyMatch[1], 10) : 1;
  const lower = description.toLowerCase();
  const isMonthlyKit = lower.includes('kit do mês') || lower.includes('kit do mes');
  const name = description
    .replace(/^DungeonBox\s+Loja\s*[—-]\s*/i, '')
    .trim();
  const planSlug = isMonthlyKit ? inferPlanSlugFromText(name) : null;

  return {
    name: name || description,
    quantity: Number.isFinite(quantity) ? quantity : 1,
    kind: isMonthlyKit ? 'monthly-kit' : 'catalog',
    productId: isMonthlyKit
      ? planSlug
        ? `monthly-kit:${planSlug}`
        : 'monthly-kit:imported'
      : 'catalog:imported',
    planSlug,
    planName: planSlug ? name.replace(/^\d+x\s*/i, '').trim() : null,
  };
}

export function buildStoreOrderMetaFromAsaasPayment(
  payment: AsaasCustomerPayment,
  bundleSubscriptionId: string
): StoreOrderMeta | null {
  const reference = parseStoreOrderExternalReference(payment.externalReference);
  if (!reference) return null;

  const parsed = parseStoreItemFromAsaasDescription(
    payment.description ?? 'Pedido da loja'
  );
  const lineTotalCents = Math.round((payment.value ?? 0) * 100);

  return {
    type: 'store_order',
    orderId: reference.orderId,
    paymentMethod: payment.billingType === 'PIX' ? 'pix' : 'credit_card',
    items: [
      {
        productId: parsed.productId,
        kind: parsed.kind,
        quantity: parsed.quantity,
        name: parsed.name,
        lineTotalCents: lineTotalCents,
        bundleSubscriptionId,
        ...(parsed.planSlug ? { planSlug: parsed.planSlug } : {}),
        ...(parsed.planName ? { planName: parsed.planName } : {}),
      },
    ],
    addressId: '',
    bundleSubscriptionId,
    shippingMode: 'with_subscription',
  };
}

/** Importa/atualiza pedidos da loja a partir do Asaas (fallback quando o banco está incompleto). */
export async function syncStoreOrdersFromAsaasForSubscriptions(
  supabase: SupabaseClient,
  subscriptionIds: string[]
): Promise<void> {
  if (subscriptionIds.length === 0) return;

  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('id, user_id, profiles(asaas_customer_id)')
    .in('id', subscriptionIds);

  for (const subscription of subscriptions ?? []) {
    const userId = subscription.user_id as string;
    const subscriptionId = subscription.id as string;
    const profile = Array.isArray(subscription.profiles)
      ? subscription.profiles[0]
      : subscription.profiles;
    const customerId = profile?.asaas_customer_id as string | null | undefined;
    if (!customerId) continue;

    let remotePayments: AsaasCustomerPayment[] = [];
    try {
      remotePayments = await listAsaasCustomerPayments(customerId);
    } catch (error) {
      console.error('[store] list asaas payments:', customerId, error);
      continue;
    }

    const storePayments = remotePayments.filter((payment) =>
      Boolean(parseStoreOrderExternalReference(payment.externalReference))
    );

    for (const remote of storePayments) {
      const reference = parseStoreOrderExternalReference(remote.externalReference);
      if (!reference || reference.userId !== userId) continue;

      const rebuiltMeta = buildStoreOrderMetaFromAsaasPayment(
        remote,
        subscriptionId
      );
      if (!rebuiltMeta) continue;

      const confirmed = isAsaasPaymentConfirmed(remote.status);
      const paidAt = confirmed
        ? remote.paymentDate ?? new Date().toISOString()
        : null;

      const { data: existing } = await supabase
        .from('payments')
        .select('id, status, status_detail')
        .eq('asaas_payment_id', remote.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from('payments').insert({
          user_id: userId,
          subscription_id: subscriptionId,
          asaas_payment_id: remote.id,
          amount_cents: Math.round((remote.value ?? 0) * 100),
          currency: 'BRL',
          status: confirmed ? 'approved' : 'pending',
          status_detail: JSON.stringify(rebuiltMeta),
          paid_at: paidAt,
          payment_method: remote.billingType?.toLowerCase() ?? null,
        });
        continue;
      }

      const existingMeta = parseStoreOrderMeta(existing.status_detail);
      if (!existingMeta) {
        await supabase
          .from('payments')
          .update({
            status_detail: JSON.stringify(rebuiltMeta),
            subscription_id: subscriptionId,
          })
          .eq('id', existing.id);
      }

      if (existing.status !== 'approved' && confirmed) {
        await approveStoreOrderPayment(supabase, remote.id, remote);
      }
    }
  }
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

export async function notifyStoreOrderConfirmed(
  supabase: SupabaseClient,
  userId: string,
  meta: StoreOrderMeta,
  amountCents: number
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .maybeSingle();

  if (!profile?.email) return;

  const subtotalCents =
    meta.subtotalCents ??
    meta.items.reduce((sum, item) => sum + item.lineTotalCents, 0);

  try {
    await sendStoreOrderConfirmedEmail({
      to: profile.email,
      name: profile.full_name,
      orderId: meta.orderId,
      items: meta.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        lineTotalCents: item.lineTotalCents,
      })),
      subtotalCents,
      shippingCents: meta.shippingCents ?? 0,
      shippingLabel: meta.shippingLabel,
      amountCents,
      bundledWithSubscription: meta.shippingMode === 'with_subscription',
    });
  } catch (error) {
    console.error('[store] order confirmed email:', error);
  }
}

export async function syncPendingBundledStoreOrders(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<void> {
  if (userIds.length === 0) return;

  const { data: rows } = await supabase
    .from('payments')
    .select('id, asaas_payment_id, status_detail, status')
    .in('user_id', userIds)
    .eq('status', 'pending')
    .not('asaas_payment_id', 'is', null)
    .ilike('status_detail', '%store_order%');

  await Promise.all(
    (rows ?? []).map(async (row) => {
      const meta = parseStoreOrderMeta(row.status_detail);
      if (!meta) return;
      if (
        meta.shippingMode !== 'with_subscription' &&
        !meta.bundleSubscriptionId &&
        !meta.items.some((line) => line.bundleSubscriptionId)
      ) {
        return;
      }

      const asaasId = row.asaas_payment_id as string;
      try {
        const remote = await fetchAsaasPayment(asaasId);
        if (isAsaasPaymentConfirmed(remote.status)) {
          await approveStoreOrderPayment(supabase, asaasId, remote);
        }
      } catch (error) {
        console.error('[store] sync pending bundled order:', asaasId, error);
      }
    })
  );
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
  await notifyStoreOrderConfirmed(
    supabase,
    paymentRow.user_id,
    meta,
    amountCents ?? paymentRow.amount_cents ?? 0
  );

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
