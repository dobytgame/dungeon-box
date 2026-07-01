import type { SupabaseClient } from '@supabase/supabase-js';
import { ensureSubscriptionCycle } from '@/lib/subscriptions/cycles';

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

const ACTIVATABLE_STATUSES = new Set([
  'pending',
  'past_due',
  'paused',
  'cancelled',
]);

const DEACTIVATABLE_STATUSES = new Set([
  'active',
  'paused',
  'past_due',
  'pending',
]);

/** Ativa assinatura localmente, sem sincronizar com gateway. */
export async function manualActivateSubscription(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<{ error?: string }> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, prepaid_until, prepaid_months')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription) {
    return { error: 'Assinatura não encontrada.' };
  }

  if (!ACTIVATABLE_STATUSES.has(subscription.status)) {
    if (subscription.status === 'active') {
      await ensureSubscriptionCycle(supabase, subscriptionId, 1);
      return {};
    }
    return { error: `Não é possível ativar assinatura com status "${subscription.status}".` };
  }

  const now = new Date();
  const prepaidUntil = subscription.prepaid_until
    ? new Date(subscription.prepaid_until)
    : subscription.prepaid_months
      ? addMonths(now, subscription.prepaid_months)
      : null;
  const periodEnd = prepaidUntil ?? addMonths(now, 1);
  const nowIso = now.toISOString();

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      started_at: nowIso,
      current_period_start: nowIso,
      current_period_end: periodEnd.toISOString(),
      next_billing_date: periodEnd.toISOString(),
      prepaid_until: prepaidUntil?.toISOString() ?? null,
      current_cycle: 1,
      cancelled_at: null,
      cancel_reason: null,
      updated_at: nowIso,
    })
    .eq('id', subscriptionId)
    .in('status', Array.from(ACTIVATABLE_STATUSES));

  if (error) {
    return { error: error.message };
  }

  await ensureSubscriptionCycle(supabase, subscriptionId, 1);
  return {};
}

/** Desativa assinatura localmente, sem sincronizar com gateway. */
export async function manualDeactivateSubscription(
  supabase: SupabaseClient,
  subscriptionId: string,
  reason?: string | null
): Promise<{ error?: string }> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription) {
    return { error: 'Assinatura não encontrada.' };
  }

  if (!DEACTIVATABLE_STATUSES.has(subscription.status)) {
    return {
      error: `Não é possível desativar assinatura com status "${subscription.status}".`,
    };
  }

  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'cancelled',
      cancelled_at: nowIso,
      cancel_reason:
        reason?.trim() || 'Desativada manualmente pelo admin.',
      updated_at: nowIso,
    })
    .eq('id', subscriptionId)
    .in('status', Array.from(DEACTIVATABLE_STATUSES));

  if (error) {
    return { error: error.message };
  }

  return {};
}
