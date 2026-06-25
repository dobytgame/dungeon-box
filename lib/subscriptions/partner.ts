import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanSlug } from '@/lib/checkout/plans';
import { findBlockingSubscriptionForPlan } from '@/lib/subscriptions/find-blocking';
import {
  ensureSubscriptionCycle,
  markCyclePreparing,
} from '@/lib/subscriptions/cycles';

export const PARTNER_PAYMENT_METHOD = 'partner';

export function isPartnerSubscription(
  subscription: { is_partner?: boolean | null } | null | undefined
): boolean {
  return Boolean(subscription?.is_partner);
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/** Garante pagamento simbólico (R$ 0) e ciclo liberado para produção. */
export async function ensurePartnerCyclePayment(
  supabase: SupabaseClient,
  subscriptionId: string,
  userId: string,
  cycleNumber: number
): Promise<string | null> {
  const { data: existingCycle } = await supabase
    .from('subscription_cycles')
    .select('id, payment_id')
    .eq('subscription_id', subscriptionId)
    .eq('cycle_number', cycleNumber)
    .maybeSingle();

  if (existingCycle?.payment_id) {
    return existingCycle.payment_id;
  }

  const nowIso = new Date().toISOString();

  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      user_id: userId,
      subscription_id: subscriptionId,
      amount_cents: 0,
      currency: 'BRL',
      status: 'approved',
      payment_method: PARTNER_PAYMENT_METHOD,
      status_detail: JSON.stringify({
        type: 'partner',
        note: 'Parceiro — sem cobrança',
      }),
      paid_at: nowIso,
    })
    .select('id, amount_cents, paid_at')
    .single();

  if (paymentError || !payment) {
    console.error('ensurePartnerCyclePayment:', paymentError);
    return null;
  }

  await ensureSubscriptionCycle(supabase, subscriptionId, cycleNumber);
  await markCyclePreparing(supabase, subscriptionId, cycleNumber, {
    id: payment.id,
    amount_cents: payment.amount_cents,
    paid_at: payment.paid_at,
  });

  return payment.id;
}

/** Ativa ou mantém assinatura de parceiro sem passar pelo Asaas. */
export async function activatePartnerSubscription(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, user_id, status, current_cycle')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!sub?.user_id) {
    return { success: false, error: 'Assinatura não encontrada.' };
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const cycleNumber = Math.max(sub.current_cycle ?? 0, 1);
  const periodEnd = addMonths(now, 12);

  const updates: Record<string, unknown> = {
    is_partner: true,
    next_billing_date: null,
    current_cycle: cycleNumber,
    updated_at: nowIso,
  };

  if (sub.status !== 'active') {
    Object.assign(updates, {
      status: 'active',
      started_at: nowIso,
      current_period_start: nowIso,
      current_period_end: periodEnd.toISOString(),
      cancelled_at: null,
      cancel_reason: null,
    });
  }

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update(updates)
    .eq('id', subscriptionId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  await ensurePartnerCyclePayment(
    supabase,
    subscriptionId,
    sub.user_id,
    cycleNumber
  );

  return { success: true };
}

export async function clearSubscriptionPartnerFlag(
  supabase: SupabaseClient,
  subscriptionId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      is_partner: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/** Cria ou reativa assinatura de parceiro para um plano específico. */
export async function grantPartnerPlanForUser(
  supabase: SupabaseClient,
  userId: string,
  planSlug: PlanSlug
): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
  const { data: plan } = await supabase
    .from('plans')
    .select('id, slug, name')
    .eq('slug', planSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (!plan) {
    return { success: false, error: 'Plano não encontrado.' };
  }

  const existing = await findBlockingSubscriptionForPlan(
    supabase,
    userId,
    plan.id
  );

  if (existing) {
    const result = await activatePartnerSubscription(supabase, existing.id);
    if (!result.success) return result;
    return { success: true, subscriptionId: existing.id };
  }

  const { data: address } = await supabase
    .from('addresses')
    .select('id')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created, error: insertError } = await supabase
    .from('subscriptions')
    .insert({
      user_id: userId,
      plan_id: plan.id,
      address_id: address?.id ?? null,
      status: 'pending',
      is_partner: true,
      special_notes: '[Parceiro — concedido pelo admin]',
    })
    .select('id')
    .single();

  if (insertError || !created) {
    return {
      success: false,
      error: insertError?.message ?? 'Erro ao criar assinatura.',
    };
  }

  const result = await activatePartnerSubscription(supabase, created.id);
  if (!result.success) return result;

  return { success: true, subscriptionId: created.id };
}
