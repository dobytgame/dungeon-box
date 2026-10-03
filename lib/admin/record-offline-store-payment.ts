import type { SupabaseClient } from '@supabase/supabase-js';
import {
  approveStoreOrderPaymentById,
  parseStoreOrderMeta,
  type StoreOrderMeta,
} from '@/lib/asaas/store-order-payment';
import {
  paidAtFromDateInput,
  parseReaisToCents,
} from '@/lib/admin/record-offline-payment';

export const STORE_OFFLINE_PAYMENT_METHODS = ['pix', 'manual', 'cash'] as const;
export type StoreOfflinePaymentMethod = (typeof STORE_OFFLINE_PAYMENT_METHODS)[number];

export { paidAtFromDateInput, parseReaisToCents };

function isStoreOfflinePaymentMethod(value: string): value is StoreOfflinePaymentMethod {
  return (STORE_OFFLINE_PAYMENT_METHODS as readonly string[]).includes(value);
}

function mapOfflineMethodToPaymentRow(method: StoreOfflinePaymentMethod): string {
  if (method === 'pix') return 'pix';
  return 'manual';
}

function mergeOfflineMeta(
  meta: StoreOrderMeta,
  method: StoreOfflinePaymentMethod,
  note: string | null
): StoreOrderMeta {
  const methodLabel =
    method === 'pix'
      ? 'PIX direto'
      : method === 'cash'
        ? 'Dinheiro / presencial'
        : 'Transferência / manual';
  const offlineNote = [methodLabel, note].filter(Boolean).join(' — ') || methodLabel;

  return {
    ...meta,
    gateway: 'offline',
    offlineSettlement: true,
    offlineNote,
    paymentError: null,
  };
}

export async function recordOfflineStoreOrderPayment(
  admin: SupabaseClient,
  input: {
    paymentId: string;
    paidAt: string;
    amountCents: number;
    method: string;
    note?: string | null;
  }
): Promise<{ paymentId: string; orderId: string } | { error: string }> {
  if (!isStoreOfflinePaymentMethod(input.method)) {
    return { error: 'Informe como o cliente pagou (PIX, transferência ou dinheiro).' };
  }
  if (input.amountCents <= 0) {
    return { error: 'Informe um valor válido.' };
  }

  const { data: paymentRow, error: loadError } = await admin
    .from('payments')
    .select('id, user_id, status, status_detail, amount_cents')
    .eq('id', input.paymentId)
    .maybeSingle();

  if (loadError || !paymentRow) {
    return { error: 'Pedido não encontrado.' };
  }

  if (paymentRow.status === 'approved') {
    return { error: 'Este pedido já está marcado como pago.' };
  }

  const meta = parseStoreOrderMeta(paymentRow.status_detail);
  if (!meta) {
    return { error: 'Este pagamento não é um pedido da loja.' };
  }

  const mergedMeta = mergeOfflineMeta(meta, input.method, input.note?.trim() || null);
  const paymentMethod = mapOfflineMethodToPaymentRow(input.method);

  const { error: patchError } = await admin
    .from('payments')
    .update({
      status_detail: JSON.stringify(mergedMeta),
      payment_method: paymentMethod,
      payment_type: 'offline',
      amount_cents: input.amountCents,
    })
    .eq('id', input.paymentId);

  if (patchError) {
    console.error('[admin] recordOfflineStoreOrderPayment patch:', patchError.message);
    return { error: 'Não foi possível preparar o lançamento.' };
  }

  const approved = await approveStoreOrderPaymentById(
    admin,
    input.paymentId,
    input.amountCents,
    { paidAt: input.paidAt }
  );

  if (approved === 'skipped') {
    return { error: 'Não foi possível confirmar o pagamento do pedido.' };
  }

  return {
    paymentId: input.paymentId,
    orderId: meta.orderId,
  };
}
