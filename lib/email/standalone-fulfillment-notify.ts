import type { SupabaseClient } from '@supabase/supabase-js';
import {
  parseStoreOrderMeta,
  type StoreOrderMeta,
} from '@/lib/asaas/store-order-payment';
import { notifyCycleStatusChange } from '@/lib/email/cycle-status-notify';
import type { CycleStatus } from '@/lib/dashboard/types';

function describeStandaloneOrder(meta: StoreOrderMeta): string {
  if (!meta.items.length) return 'Pedido da loja';
  return meta.items
    .map((line) =>
      line.quantity > 1 ? `${line.name} ×${line.quantity}` : line.name
    )
    .join(', ');
}

async function loadStandalonePaymentContext(
  supabase: SupabaseClient,
  paymentId: string
): Promise<{
  userId: string;
  meta: StoreOrderMeta;
} | null> {
  const { data, error } = await supabase
    .from('payments')
    .select('user_id, status_detail')
    .eq('id', paymentId)
    .maybeSingle();

  if (error || !data?.user_id) {
    console.warn('[email] standalone fulfillment: payment context missing', paymentId);
    return null;
  }

  const meta = parseStoreOrderMeta(data.status_detail);
  if (!meta || meta.shippingMode !== 'standalone') {
    return null;
  }

  return {
    userId: data.user_id as string,
    meta,
  };
}

export async function notifyStandaloneStoreFulfillmentStatus(
  supabase: SupabaseClient,
  paymentId: string,
  status: CycleStatus,
  options?: {
    trackingCode?: string | null;
    carrier?: string | null;
    cancelReason?: string | null;
  }
): Promise<{ sent: boolean; reason?: string }> {
  const context = await loadStandalonePaymentContext(supabase, paymentId);
  if (!context) {
    return { sent: false, reason: 'standalone_context_missing' };
  }

  const trackingCode =
    options?.trackingCode?.trim() ||
    context.meta.trackingCode?.trim() ||
    null;

  return notifyCycleStatusChange(supabase, {
    userId: context.userId,
    cycleId: null,
    cycleNumber: 1,
    planName: describeStandaloneOrder(context.meta),
    themeName:
      (context.meta.items.find((item) => item.themeName)?.themeName as
        | string
        | undefined) ?? null,
    status,
    trackingCode,
    carrier: options?.carrier?.trim() || context.meta.carrier?.trim() || null,
    cancelReason: options?.cancelReason ?? null,
  });
}
