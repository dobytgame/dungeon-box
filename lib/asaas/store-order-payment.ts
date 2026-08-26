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
import { resolvePaintKitBumpFromStoreLine } from '@/lib/store/paint-kit-detect';
import { inferPlanSlugFromText } from '@/lib/store/plan-slug-infer';
import { sendStoreOrderConfirmedEmail } from '@/lib/email/send-transactional';
import { recordStorePromoRedemption } from '@/lib/store/promo-codes';
import { notifyAdminStoreOrderPaymentFromPaymentRow } from '@/lib/admin/store-payment-notifications';
import { parseBrazilDateOnlyToIso } from '@/lib/datetime/brazil';
import { formatVariationSummary } from '@/lib/store/product-variations';
import type { CycleStatus } from '@/lib/dashboard/types';
import {
  extractPagarmeStorePix,
  fetchPagarmeOrder,
  fetchPagarmeCharge,
  isPagarmeChargePaid,
  type PagarmeStorePixDetails,
} from '@/lib/pagarme/one-time-order';
import { parsePagarmeStoreOrderCode } from '@/lib/pagarme/store-order-code';

/** Aprovações com pagamento mais antigo que isso são sync retroativo (sem alerta de venda). */
const LATE_STORE_ORDER_APPROVAL_MS = 6 * 60 * 60 * 1000;

type ApproveStoreOrderOptions = {
  paidAt?: string | null;
  /** Força sync silencioso (sem e-mail / notificação admin). */
  silent?: boolean;
};

function resolveAsaasStoreOrderPaidAt(paymentDate?: string | null): string {
  if (paymentDate?.trim()) {
    return parseBrazilDateOnlyToIso(paymentDate.trim());
  }
  return new Date().toISOString();
}

function isLateStoreOrderApproval(paidAt: string): boolean {
  const paidMs = new Date(paidAt).getTime();
  if (Number.isNaN(paidMs)) return false;
  return Date.now() - paidMs > LATE_STORE_ORDER_APPROVAL_MS;
}

function shouldSilenceStoreOrderApproval(
  paidAt: string,
  options?: ApproveStoreOrderOptions
): boolean {
  if (options?.silent) return true;
  return isLateStoreOrderApproval(paidAt);
}

export type StoreOrderMeta = {
  type: 'store_order';
  orderId: string;
  gateway?: 'asaas' | 'pagarme';
  pagarmeOrderId?: string | null;
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
  couponCode?: string | null;
  couponSummary?: string | null;
  couponDiscountCents?: number;
  couponFreeShipping?: boolean;
  couponPromoId?: string | null;
  /** Pipeline de produção (pedidos avulsos standalone). */
  fulfillmentStatus?: string;
  /** Agrupa pedidos avulsos no mesmo card de produção. */
  productionGroupId?: string | null;
  trackingCode?: string | null;
  carrier?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  shippingCostCents?: number | null;
  productionNotes?: string | null;
  paymentError?: string | null;
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
  installment?: string | null;
  installmentNumber?: number | null;
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
  bundleSubscriptionId: string | null
): StoreOrderMeta | null {
  const reference = parseStoreOrderExternalReference(payment.externalReference);
  if (!reference) return null;

  const parsed = parseStoreItemFromAsaasDescription(
    payment.description ?? 'Pedido da loja'
  );
  const lineTotalCents = Math.round((payment.value ?? 0) * 100);
  const bundled = Boolean(bundleSubscriptionId);

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
    shippingMode: bundled ? 'with_subscription' : 'standalone',
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

      const { data: existing } = await supabase
        .from('payments')
        .select('id, status, status_detail, subscription_id')
        .eq('asaas_payment_id', remote.id)
        .maybeSingle();

      if (!existing) {
        continue;
      }

      const existingMeta = parseStoreOrderMeta(existing.status_detail);
      if (existingMeta?.shippingMode === 'standalone') {
        continue;
      }

      const rebuiltMeta =
        existingMeta ??
        buildStoreOrderMetaFromAsaasPayment(remote, subscriptionId);
      if (!rebuiltMeta) continue;

      const confirmed = isAsaasPaymentConfirmed(remote.status);

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
    const bumpId = resolvePaintKitBumpFromStoreLine(item);
    if (!bumpId) continue;

    const bundleSubscriptionId =
      item.bundleSubscriptionId ?? meta.bundleSubscriptionId;
    if (!bundleSubscriptionId) continue;

    return { bumpId, bundleSubscriptionId };
  }

  return null;
}

export async function findStoreOrderPaymentRow(
  supabase: SupabaseClient,
  userId: string,
  orderId: string
) {
  const { data: rows } = await supabase
    .from('payments')
    .select(
      'id, status, status_detail, asaas_payment_id, pagarme_charge_id, amount_cents, payment_method, created_at'
    )
    .eq('user_id', userId)
    .ilike('status_detail', '%store_order%')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    (rows ?? []).find((row) => {
      const meta = parseStoreOrderMeta(row.status_detail);
      return meta?.orderId === orderId;
    }) ?? null
  );
}

export async function findStoreOrderPaymentRowByOrderId(
  supabase: SupabaseClient,
  orderId: string
) {
  const { data: rows } = await supabase
    .from('payments')
    .select(
      'id, status, status_detail, asaas_payment_id, pagarme_charge_id, amount_cents, payment_method, created_at, user_id'
    )
    .ilike('status_detail', `%\"orderId\":\"${orderId}\"%`)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    (rows ?? []).find((row) => {
      const meta = parseStoreOrderMeta(row.status_detail);
      return meta?.orderId === orderId;
    }) ?? null
  );
}

export async function createPendingStoreOrderPayment(
  admin: SupabaseClient,
  input: {
    userId: string;
    subscriptionId: string | null;
    amountCents: number;
    paymentMethod: 'credit_card' | 'pix';
    orderMeta: StoreOrderMeta;
  }
): Promise<{ id: string } | { error: string }> {
  const { data, error } = await admin
    .from('payments')
    .insert({
      user_id: input.userId,
      subscription_id: input.subscriptionId,
      asaas_payment_id: null,
      amount_cents: input.amountCents,
      currency: 'BRL',
      status: 'pending',
      status_detail: JSON.stringify(input.orderMeta),
      paid_at: null,
      payment_method: input.paymentMethod,
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    return {
      error: error?.message ?? 'Não foi possível registrar o pedido.',
    };
  }

  void notifyAdminStoreOrderPaymentFromPaymentRow(admin, {
    type: 'store_order_payment_pending',
    paymentId: data.id as string,
    userId: input.userId,
    statusDetail: JSON.stringify(input.orderMeta),
    amountCents: input.amountCents,
    paymentMethod: input.paymentMethod,
  }).catch((err) => {
    console.error('[admin] store order pending notification:', err);
  });

  return { id: data.id as string };
}

export async function attachAsaasPaymentToStoreOrder(
  admin: SupabaseClient,
  localPaymentId: string,
  asaasPaymentId: string,
  patch?: {
    status?: string;
    paid_at?: string | null;
  }
): Promise<void> {
  const { error } = await admin
    .from('payments')
    .update({
      asaas_payment_id: asaasPaymentId,
      ...patch,
    })
    .eq('id', localPaymentId);

  if (error) {
    console.error('[store] attach asaas payment:', localPaymentId, error.message);
  }
}

export async function attachPagarmePaymentToStoreOrder(
  admin: SupabaseClient,
  localPaymentId: string,
  input: {
    pagarmeOrderId: string;
    pagarmeChargeId: string | null;
    patch?: {
      status?: string;
      paid_at?: string | null;
    };
  }
): Promise<void> {
  const { data } = await admin
    .from('payments')
    .select('status_detail')
    .eq('id', localPaymentId)
    .maybeSingle();

  const meta = parseStoreOrderMeta(data?.status_detail);
  if (!meta) {
    throw new Error('Pedido da loja não encontrado para vincular ao Pagar.me.');
  }

  const nextMeta: StoreOrderMeta = {
    ...meta,
    gateway: 'pagarme',
    pagarmeOrderId: input.pagarmeOrderId,
  };

  const update: Record<string, unknown> = {
    status_detail: JSON.stringify(nextMeta),
    ...input.patch,
  };

  if (input.pagarmeChargeId) {
    update.pagarme_charge_id = input.pagarmeChargeId;
  }

  const { error } = await admin
    .from('payments')
    .update(update)
    .eq('id', localPaymentId);

  if (error) {
    console.error('[store] attach pagarme payment:', localPaymentId, error.message);
    throw new Error('Não foi possível registrar o pagamento Pagar.me.');
  }
}

export async function markStoreOrderPaymentFailed(
  admin: SupabaseClient,
  localPaymentId: string,
  detail?: string
): Promise<void> {
  if (!detail) return;

  const { data } = await admin
    .from('payments')
    .select('status_detail')
    .eq('id', localPaymentId)
    .maybeSingle();

  const meta = parseStoreOrderMeta(data?.status_detail);
  if (!meta) return;

  const hadError = Boolean(meta.paymentError);
  const nextMeta = { ...meta, paymentError: detail };
  await admin
    .from('payments')
    .update({ status_detail: JSON.stringify(nextMeta) })
    .eq('id', localPaymentId);

  if (!hadError) {
    const { data: paymentRow } = await admin
      .from('payments')
      .select('user_id, amount_cents, payment_method')
      .eq('id', localPaymentId)
      .maybeSingle();

    if (paymentRow?.user_id) {
      void notifyAdminStoreOrderPaymentFromPaymentRow(admin, {
        type: 'store_order_payment_failed',
        paymentId: localPaymentId,
        userId: paymentRow.user_id as string,
        statusDetail: JSON.stringify(nextMeta),
        amountCents: paymentRow.amount_cents as number | null,
        paymentMethod: paymentRow.payment_method as string | null,
        detail,
      }).catch((err) => {
        console.error('[admin] store order failed notification:', err);
      });
    }
  }
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
      items: meta.items.map((item) => {
        const selectedOptions =
          typeof item.selectedOptions === 'object' && item.selectedOptions !== null
            ? (item.selectedOptions as Record<string, string>)
            : undefined;

        return {
          name: item.name,
          quantity: item.quantity,
          unitPriceCents:
            item.quantity > 0
              ? Math.round(item.lineTotalCents / item.quantity)
              : item.lineTotalCents,
          lineTotalCents: item.lineTotalCents,
          variationSummary: formatVariationSummary(selectedOptions),
        };
      }),
      subtotalCents,
      shippingCents: meta.shippingCents ?? 0,
      shippingLabel: meta.shippingLabel,
      amountCents,
      bundledWithSubscription: meta.shippingMode === 'with_subscription',
      couponCode: meta.couponCode,
      couponDiscountCents: meta.couponDiscountCents,
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

      const asaasId = row.asaas_payment_id as string;
      try {
        const remote = await fetchAsaasPayment(asaasId);
        if (isAsaasPaymentConfirmed(remote.status)) {
          await approveStoreOrderPayment(supabase, asaasId, remote);
        }
      } catch (error) {
        console.error('[store] sync pending store order:', asaasId, error);
      }
    })
  );
}

export async function approveStoreOrderPayment(
  supabase: SupabaseClient,
  asaasPaymentId: string,
  payment: Pick<AsaasWebhookPayment, 'value' | 'paymentDate'>
): Promise<'processed' | 'skipped'> {
  const paymentRow = (
    await supabase
      .from('payments')
      .select('id, user_id, status, status_detail, amount_cents, created_at')
      .eq('asaas_payment_id', asaasPaymentId)
      .maybeSingle()
  ).data;

  if (!paymentRow) return 'skipped';

  const amountCents =
    payment.value != null
      ? Math.round(payment.value * 100)
      : paymentRow.amount_cents;

  const paidAt = payment.paymentDate?.trim()
    ? resolveAsaasStoreOrderPaidAt(payment.paymentDate)
    : (paymentRow.created_at as string | null) ?? new Date().toISOString();

  return approveStoreOrderPaymentRow(supabase, paymentRow, amountCents, {
    paidAt,
  });
}

export function resolvePagarmeStoreOrderReference(input: {
  code?: string | null;
  metadata?: Record<string, string> | null;
}): { orderId: string; userId?: string } | null {
  const metaOrderId = input.metadata?.store_order_id?.trim();
  const metaUserId = input.metadata?.store_user_id?.trim();
  if (metaOrderId) {
    return {
      orderId: metaOrderId,
      ...(metaUserId ? { userId: metaUserId } : {}),
    };
  }

  const externalReference = parseStoreOrderExternalReference(
    input.metadata?.external_reference
  );
  if (externalReference) return externalReference;

  return parsePagarmeStoreOrderCode(input.code);
}

export async function approveStoreOrderPaymentById(
  supabase: SupabaseClient,
  paymentId: string,
  amountCents?: number | null,
  options?: ApproveStoreOrderOptions
): Promise<'processed' | 'skipped'> {
  const paymentRow = (
    await supabase
      .from('payments')
      .select('id, user_id, status, status_detail, amount_cents, created_at')
      .eq('id', paymentId)
      .maybeSingle()
  ).data;

  if (!paymentRow) return 'skipped';

  return approveStoreOrderPaymentRow(
    supabase,
    paymentRow,
    amountCents ?? paymentRow.amount_cents,
    options
  );
}

export async function approveStoreOrderPaymentByPagarmeCharge(
  supabase: SupabaseClient,
  pagarmeChargeId: string,
  amountCents?: number | null,
  options?: ApproveStoreOrderOptions
): Promise<'processed' | 'skipped'> {
  const paymentRow = (
    await supabase
      .from('payments')
      .select('id, user_id, status, status_detail, amount_cents, created_at')
      .eq('pagarme_charge_id', pagarmeChargeId)
      .maybeSingle()
  ).data;

  if (!paymentRow) return 'skipped';

  return approveStoreOrderPaymentRow(
    supabase,
    paymentRow,
    amountCents ?? paymentRow.amount_cents,
    {
      paidAt: options?.paidAt ?? (paymentRow.created_at as string | null),
      silent: options?.silent,
    }
  );
}

async function approveStoreOrderPaymentRow(
  supabase: SupabaseClient,
  paymentRow: {
    id: string;
    user_id: string;
    status: string;
    status_detail: unknown;
    amount_cents: number | null;
    created_at?: string | null;
  },
  amountCents: number | null,
  options?: ApproveStoreOrderOptions
): Promise<'processed' | 'skipped'> {

  const meta = parseStoreOrderMeta(paymentRow.status_detail);
  if (!meta) return 'skipped';

  if (paymentRow.status === 'approved') {
    return 'processed';
  }

  const paidAt =
    options?.paidAt?.trim() ||
    paymentRow.created_at?.trim() ||
    new Date().toISOString();
  const silent = shouldSilenceStoreOrderApproval(paidAt, options);
  const resolvedAmountCents = amountCents ?? paymentRow.amount_cents;

  await supabase
    .from('payments')
    .update({
      ...(resolvedAmountCents != null ? { amount_cents: resolvedAmountCents } : {}),
      status: 'approved',
      paid_at: paidAt,
      ...(meta.shippingMode === 'standalone' ? { subscription_id: null } : {}),
    })
    .eq('id', paymentRow.id);

  if (meta.shippingMode === 'standalone') {
    const { findActiveProductionMergeTargetForUser } = await import(
      '@/lib/admin/standalone-store-production'
    );
    const mergeTarget = await findActiveProductionMergeTargetForUser(
      supabase,
      paymentRow.user_id
    );
    const fulfillmentPatch: Partial<StoreOrderMeta> = {
      fulfillmentStatus: 'upcoming',
    };
    if (mergeTarget?.kind === 'standalone') {
      fulfillmentPatch.productionGroupId = mergeTarget.leadPaymentId;
      fulfillmentPatch.fulfillmentStatus = mergeTarget.status;
    } else if (mergeTarget?.kind === 'subscription') {
      fulfillmentPatch.fulfillmentStatus = mergeTarget.status;
    }
    await updateStandaloneStoreOrderMeta(
      supabase,
      paymentRow.id,
      fulfillmentPatch
    );
  }

  await fulfillApprovedStoreOrder(supabase, paymentRow.user_id, meta);

  if (!silent) {
    await notifyStoreOrderConfirmed(
      supabase,
      paymentRow.user_id,
      meta,
      resolvedAmountCents ?? paymentRow.amount_cents ?? 0
    );

    if (meta.couponPromoId && meta.couponCode) {
      await recordStorePromoRedemption(
        supabase,
        meta.couponPromoId,
        paymentRow.user_id
      );
    }

    void notifyAdminStoreOrderPaymentFromPaymentRow(supabase, {
      type: 'store_order_payment_approved',
      paymentId: paymentRow.id,
      userId: paymentRow.user_id,
      statusDetail: paymentRow.status_detail,
      amountCents: resolvedAmountCents,
      paymentMethod: meta.paymentMethod,
    }).catch((err) => {
      console.error('[admin] store order approved notification:', err);
    });
  } else {
    console.info(
      '[store] late store order approval — notifications skipped:',
      paymentRow.id,
      paidAt
    );
  }

  return 'processed';
}

async function recoverStoreOrderPaymentFromWebhook(
  supabase: SupabaseClient,
  payment: AsaasWebhookPayment,
  reference: { userId: string; orderId: string }
): Promise<'processed' | 'skipped'> {
  const paymentRow = await findStoreOrderPaymentRow(
    supabase,
    reference.userId,
    reference.orderId
  );

  if (paymentRow) {
    if (!paymentRow.asaas_payment_id) {
      await supabase
        .from('payments')
        .update({ asaas_payment_id: payment.id })
        .eq('id', paymentRow.id);
    }
    return approveStoreOrderPayment(supabase, payment.id, payment);
  }

  let remote: AsaasCustomerPayment;
  try {
    remote = await fetchAsaasPayment(payment.id);
  } catch (error) {
    console.error('[store] recover payment fetch:', payment.id, error);
    return 'skipped';
  }

  const meta = buildStoreOrderMetaFromAsaasPayment(remote, null);
  if (!meta) return 'skipped';

  meta.orderId = reference.orderId;
  meta.shippingMode = 'standalone';
  meta.bundleSubscriptionId = null;
  for (const item of meta.items) {
    item.bundleSubscriptionId = null;
  }

  const amountCents = Math.round((payment.value ?? remote.value ?? 0) * 100);
  const paidAt = resolveAsaasStoreOrderPaidAt(remote.paymentDate ?? payment.paymentDate);

  await supabase.from('payments').upsert(
    {
      user_id: reference.userId,
      subscription_id: null,
      asaas_payment_id: payment.id,
      amount_cents: amountCents,
      currency: 'BRL',
      status: 'approved',
      status_detail: JSON.stringify(meta),
      paid_at: paidAt,
      payment_method: remote.billingType?.toLowerCase() ?? null,
    },
    { onConflict: 'asaas_payment_id' }
  );

  return approveStoreOrderPayment(supabase, payment.id, {
    ...payment,
    paymentDate: remote.paymentDate ?? payment.paymentDate,
  });
}

export async function handleStoreOrderPagarmeChargePaid(
  supabase: SupabaseClient,
  charge: {
    id?: string;
    amount?: number;
    code?: string | null;
    metadata?: Record<string, string>;
  }
): Promise<'processed' | 'skipped'> {
  if (charge.id) {
    const byCharge = await approveStoreOrderPaymentByPagarmeCharge(
      supabase,
      charge.id,
      charge.amount != null ? Math.round(charge.amount) : null
    );
    if (byCharge === 'processed') return 'processed';
  }

  const reference = resolvePagarmeStoreOrderReference(charge);
  if (!reference) return 'skipped';

  const paymentRow = reference.userId
    ? await findStoreOrderPaymentRow(
        supabase,
        reference.userId,
        reference.orderId
      )
    : await findStoreOrderPaymentRowByOrderId(supabase, reference.orderId);
  if (!paymentRow) return 'skipped';

  if (charge.id && !paymentRow.pagarme_charge_id) {
    const { error } = await supabase
      .from('payments')
      .update({ pagarme_charge_id: charge.id })
      .eq('id', paymentRow.id);

    if (error) {
      console.error(
        '[store] attach pagarme charge on webhook:',
        paymentRow.id,
        error.message
      );
    } else {
      const byCharge = await approveStoreOrderPaymentByPagarmeCharge(
        supabase,
        charge.id,
        charge.amount != null ? Math.round(charge.amount) : null
      );
      if (byCharge === 'processed') return 'processed';
    }
  }

  return approveStoreOrderPaymentById(
    supabase,
    paymentRow.id,
    charge.amount != null ? Math.round(charge.amount) : null
  );
}

export async function handleStoreOrderPagarmePaymentFailed(
  supabase: SupabaseClient,
  order: {
    code?: string | null;
    id?: string;
    metadata?: Record<string, string>;
  }
): Promise<'processed' | 'skipped'> {
  const reference = resolvePagarmeStoreOrderReference(order);
  if (!reference) return 'skipped';

  const paymentRow = reference.userId
    ? await findStoreOrderPaymentRow(
        supabase,
        reference.userId,
        reference.orderId
      )
    : await findStoreOrderPaymentRowByOrderId(supabase, reference.orderId);

  if (!paymentRow || paymentRow.status === 'approved') return 'skipped';

  await markStoreOrderPaymentFailed(
    supabase,
    paymentRow.id,
    'Pagamento recusado pelo Pagar.me.'
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

  const result = await approveStoreOrderPayment(supabase, payment.id, payment);
  if (result === 'processed') {
    return 'processed';
  }

  return recoverStoreOrderPaymentFromWebhook(supabase, payment, reference);
}

export type StoreOrderStatusResult = {
  state: 'approved' | 'pending' | 'not_found';
  pix?: AsaasPixQrCode | PagarmeStorePixDetails;
  order?: StoreOrderPurchaseAnalytics;
  amountCents?: number | null;
};

function buildOrderStatusResult(
  meta: StoreOrderMeta | null,
  state: StoreOrderStatusResult['state'],
  amountCents?: number | null,
  pix?: AsaasPixQrCode | PagarmeStorePixDetails
): StoreOrderStatusResult {
  const order = meta ? buildStoreOrderPurchaseAnalytics(meta, amountCents) : null;
  return {
    state,
    amountCents: amountCents ?? null,
    ...(pix ? { pix } : {}),
    ...(order ? { order } : {}),
  };
}

export async function syncStoreOrderPaymentByOrderId(
  supabase: SupabaseClient,
  userId: string,
  orderId: string
): Promise<StoreOrderStatusResult> {
  const paymentRow = await findStoreOrderPaymentRow(supabase, userId, orderId);

  if (!paymentRow) {
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

  if (meta?.gateway === 'pagarme' || meta?.pagarmeOrderId || paymentRow.pagarme_charge_id) {
    const pagarmeOrderId = meta?.pagarmeOrderId ?? null;

    if (!pagarmeOrderId && paymentRow.pagarme_charge_id) {
      try {
        const charge = await fetchPagarmeCharge(paymentRow.pagarme_charge_id);
        if (isPagarmeChargePaid(charge.status)) {
          await approveStoreOrderPaymentByPagarmeCharge(
            supabase,
            charge.id,
            charge.amount ?? paymentRow.amount_cents
          );
          return buildOrderStatusResult(meta, 'approved', paymentRow.amount_cents);
        }
      } catch (error) {
        console.error('[store] sync pagarme charge status:', error);
      }
    }

    if (!pagarmeOrderId) {
      return buildOrderStatusResult(meta, 'pending', paymentRow.amount_cents);
    }

    try {
      const remote = await fetchPagarmeOrder(pagarmeOrderId);
      const charge = remote.charges?.[0];
      const chargeStatus = charge?.status ?? charge?.last_transaction?.status ?? remote.status;

      if (charge?.id && isPagarmeChargePaid(chargeStatus)) {
        await approveStoreOrderPaymentByPagarmeCharge(
          supabase,
          charge.id,
          charge.amount ?? paymentRow.amount_cents
        );
        return buildOrderStatusResult(meta, 'approved', paymentRow.amount_cents);
      }

      if (meta?.paymentMethod === 'pix') {
        const pix = extractPagarmeStorePix(remote);
        if (pix) {
          return buildOrderStatusResult(
            meta,
            isPagarmeChargePaid(chargeStatus) ? 'approved' : 'pending',
            paymentRow.amount_cents,
            pix
          );
        }
      }
    } catch (error) {
      console.error('[store] sync pagarme payment status:', error);
    }

    return buildOrderStatusResult(meta, 'pending', paymentRow.amount_cents);
  }

  if (!paymentRow.asaas_payment_id) {
    return buildOrderStatusResult(meta, 'pending', paymentRow.amount_cents);
  }

  let remoteStatus: string | undefined;

  try {
    const remote = await fetchAsaasPayment(paymentRow.asaas_payment_id);
    remoteStatus = remote.status;

    if (isAsaasPaymentConfirmed(remote.status)) {
      await approveStoreOrderPayment(supabase, paymentRow.asaas_payment_id, {
        value: remote.value,
        paymentDate: remote.paymentDate,
      });
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

export async function syncPendingPagarmeStoreOrders(
  supabase: SupabaseClient,
  options?: { userId?: string }
): Promise<void> {
  let query = supabase
    .from('payments')
    .select('id, user_id, status_detail, pagarme_charge_id')
    .eq('status', 'pending')
    .ilike('status_detail', '%store_order%');

  if (options?.userId) {
    query = query.eq('user_id', options.userId);
  }

  const { data: rows } = await query;

  await Promise.all(
    (rows ?? []).map(async (row) => {
      const meta = parseStoreOrderMeta(row.status_detail);
      if (!meta) return;

      const isPagarme =
        meta.gateway === 'pagarme' ||
        Boolean(meta.pagarmeOrderId) ||
        Boolean(row.pagarme_charge_id);
      if (!isPagarme) return;

      try {
        await syncStoreOrderPaymentByOrderId(
          supabase,
          row.user_id as string,
          meta.orderId
        );
      } catch (error) {
        console.error('[store] sync pending pagarme order:', meta.orderId, error);
      }
    })
  );
}

const PIPELINE_STATUSES = new Set<CycleStatus>([
  'upcoming',
  'production',
  'preparing',
  'packed',
  'awaiting_pickup',
  'shipped',
  'delivered',
]);

export function parseStandaloneFulfillmentStatus(
  meta: StoreOrderMeta | null
): CycleStatus {
  const raw = meta?.fulfillmentStatus;
  if (raw && PIPELINE_STATUSES.has(raw as CycleStatus)) {
    return raw as CycleStatus;
  }
  return 'upcoming';
}

export async function readStoreOrderPaymentMeta(
  supabase: SupabaseClient,
  paymentId: string
): Promise<{ paymentId: string; meta: StoreOrderMeta } | null> {
  const { data } = await supabase
    .from('payments')
    .select('id, status_detail')
    .eq('id', paymentId)
    .maybeSingle();

  if (!data) return null;
  const meta = parseStoreOrderMeta(data.status_detail);
  if (!meta || meta.shippingMode !== 'standalone') return null;
  return { paymentId: data.id as string, meta };
}

export async function updateStandaloneStoreOrderMeta(
  supabase: SupabaseClient,
  paymentId: string,
  patch: Partial<StoreOrderMeta>
): Promise<StoreOrderMeta | null> {
  const current = await readStoreOrderPaymentMeta(supabase, paymentId);
  if (!current) return null;

  const meta: StoreOrderMeta = { ...current.meta, ...patch };
  const { error } = await supabase
    .from('payments')
    .update({ status_detail: JSON.stringify(meta) })
    .eq('id', paymentId);

  if (error) {
    console.error('[store] update standalone fulfillment:', paymentId, error);
    return null;
  }

  return meta;
}
