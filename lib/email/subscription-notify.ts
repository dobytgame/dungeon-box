import type { SupabaseClient } from '@supabase/supabase-js';
import {
  sendPurchaseCompletedEmail,
  sendSubscriptionCancelledEmail,
} from '@/lib/email/send-transactional';
import { getSubscriptionEmailContext } from '@/lib/email/user-context';

export async function notifyPurchaseCompleted(
  supabase: SupabaseClient,
  subscriptionId: string,
  amountCents: number,
  cycleNumber?: number,
): Promise<void> {
  const ctx = await getSubscriptionEmailContext(supabase, subscriptionId);
  if (!ctx) return;

  const result = await sendPurchaseCompletedEmail({
    to: ctx.email,
    name: ctx.name,
    planName: ctx.planName,
    amountCents,
    cycleNumber: cycleNumber ?? ctx.currentCycle,
  });

  if (!result.sent) {
    console.warn('[email] purchase completed not sent:', {
      subscriptionId,
      to: ctx.email,
      reason: result.reason,
      message: result.message,
    });
  }
}

export async function notifySubscriptionCancelled(
  supabase: SupabaseClient,
  subscriptionId: string,
  options?: {
    effectiveUntil?: string | null;
    hasPendingShipment?: boolean;
  },
): Promise<void> {
  const ctx = await getSubscriptionEmailContext(supabase, subscriptionId);
  if (!ctx) return;

  const { data: pendingCycle } = await supabase
    .from('subscription_cycles')
    .select('id')
    .eq('subscription_id', subscriptionId)
    .in('status', ['preparing', 'shipped'])
    .limit(1)
    .maybeSingle();

  await sendSubscriptionCancelledEmail({
    to: ctx.email,
    name: ctx.name,
    planName: ctx.planName,
    effectiveUntil: options?.effectiveUntil ?? null,
    hasPendingShipment:
      options?.hasPendingShipment ?? Boolean(pendingCycle),
  });
}
