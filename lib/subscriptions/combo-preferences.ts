import type { SupabaseClient } from '@supabase/supabase-js';
import {
  pauseAsaasSubscription,
  resumeAsaasSubscription,
} from '@/lib/asaas/subscription-api';
import { ASAAS_CONFIGURED } from '@/lib/asaas/client';
import { isComboTerm, type BillingTerm } from '@/lib/checkout/combo-billing';
import { PAGARME_CONFIGURED } from '@/lib/pagarme/client';
import {
  pausePagarmeSubscriptionBilling,
  resumePagarmeSubscriptionBilling,
} from '@/lib/pagarme/subscription-api';
import {
  syncAsaasSubscriptionComboRecurring,
  syncPagarmeSubscriptionComboRecurring,
  syncPagarmeSubscriptionMonthlyRecurring,
} from '@/lib/subscriptions/combo-recurring-gateway';
import { resolveResumeBillingDate } from '@/lib/subscriptions/apply-status-change';
import {
  resolveSubscriptionRecurringCharge,
  type PlanChargeRow,
} from '@/lib/subscriptions/recurring-charge';

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function parsePrepaidUntil(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

type ComboSubscriptionRow = {
  id: string;
  user_id: string;
  status: string;
  billing_term: string | null;
  prepaid_until: string | null;
  combo_total_cents: number | null;
  combo_auto_renew: boolean | null;
  pending_billing_term: string | null;
  pagarme_subscription_id: string | null;
  pagarme_customer_id: string | null;
  asaas_subscription_id: string | null;
  asaas_customer_id: string | null;
  next_billing_date: string | null;
  promo_code?: string | null;
  shipping_cents?: number | null;
  special_notes?: string | null;
  plans?: PlanChargeRow | PlanChargeRow[] | null;
};

async function loadComboSubscription(
  supabase: SupabaseClient,
  subscriptionId: string,
  userId: string
): Promise<{ row: ComboSubscriptionRow } | { error: string }> {
  const { data } = await supabase
    .from('subscriptions')
    .select(
      `
      id,
      user_id,
      status,
      billing_term,
      prepaid_until,
      combo_total_cents,
      combo_auto_renew,
      pending_billing_term,
      pagarme_subscription_id,
      pagarme_customer_id,
      asaas_subscription_id,
      asaas_customer_id,
      next_billing_date,
      promo_code,
      shipping_cents,
      special_notes,
      plans!plan_id(name, slug, price_cents)
    `
    )
    .eq('id', subscriptionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return { error: 'Assinatura não encontrada.' };
  const term = (data.billing_term as BillingTerm | null) ?? 'monthly';
  if (!isComboTerm(term)) {
    return { error: 'Esta ação só se aplica a assinaturas combo.' };
  }
  if (!['active', 'past_due', 'paused'].includes(data.status as string)) {
    return { error: 'Assinatura não está ativa.' };
  }

  return { row: data as ComboSubscriptionRow };
}

async function pauseComboGatewayBilling(row: ComboSubscriptionRow): Promise<void> {
  if (row.pagarme_subscription_id && PAGARME_CONFIGURED) {
    await pausePagarmeSubscriptionBilling(row.pagarme_subscription_id);
    return;
  }
  if (row.asaas_subscription_id && ASAAS_CONFIGURED) {
    await pauseAsaasSubscription(row.asaas_subscription_id);
  }
}

async function resumeComboGatewayBilling(
  supabase: SupabaseClient,
  row: ComboSubscriptionRow,
  billingTerm: Exclude<BillingTerm, 'monthly'>,
  plan: PlanChargeRow
): Promise<void> {
  const prepaidUntil = parsePrepaidUntil(row.prepaid_until);
  const resumeAt = prepaidUntil && prepaidUntil > new Date()
    ? prepaidUntil
    : resolveResumeBillingDate(row.next_billing_date);

  const comboTotal = row.combo_total_cents ?? 0;

  if (row.pagarme_subscription_id && PAGARME_CONFIGURED && comboTotal > 0) {
    const pagarmeResult = await syncPagarmeSubscriptionComboRecurring(
      row.pagarme_subscription_id,
      {
        localSubscriptionId: row.id,
        planName: plan.name,
        planSlug: plan.slug ?? null,
        billingTerm,
        comboTotalCents: comboTotal,
        nextBillingAt: resumeAt,
        pagarmeCustomerId: row.pagarme_customer_id,
      },
      supabase
    );
    const pagarmeId =
      pagarmeResult.status === 'recreated'
        ? pagarmeResult.pagarmeSubscriptionId
        : row.pagarme_subscription_id;
    await resumePagarmeSubscriptionBilling(pagarmeId, resumeAt);
    return;
  }

  if (row.asaas_subscription_id && ASAAS_CONFIGURED && comboTotal > 0) {
    const asaasCustomerId = row.asaas_customer_id?.trim() || null;
    if (!asaasCustomerId) {
      throw new Error('Cliente Asaas não encontrado na assinatura.');
    }

    const asaasResult = await syncAsaasSubscriptionComboRecurring(supabase, {
      localSubscriptionId: row.id,
      asaasSubscriptionId: row.asaas_subscription_id,
      asaasCustomerId,
      planName: plan.name,
      billingTerm,
      comboTotalCents: comboTotal,
      nextDueDate: resumeAt,
    });

    if (asaasResult.status === 'failed') {
      throw new Error(asaasResult.reason);
    }

    const asaasId =
      asaasResult.status === 'recreated'
        ? asaasResult.asaasSubscriptionId
        : row.asaas_subscription_id;
    await resumeAsaasSubscription(asaasId, resumeAt);
  }
}

export async function setComboAutoRenew(
  supabase: SupabaseClient,
  subscriptionId: string,
  userId: string,
  enabled: boolean
): Promise<{ error?: string }> {
  const loaded = await loadComboSubscription(supabase, subscriptionId, userId);
  if ('error' in loaded) return loaded;

  const row = loaded.row;
  const billingTerm = row.billing_term as Exclude<BillingTerm, 'monthly'>;
  const plan = relOne(row.plans);
  if (!plan?.name) return { error: 'Plano não encontrado.' };

  if (enabled && row.pending_billing_term === 'monthly') {
    return {
      error:
        'Você já agendou mudança para mensal. Cancele essa mudança antes de reativar o combo.',
    };
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      combo_auto_renew: enabled,
      pending_billing_term: enabled ? null : row.pending_billing_term,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .eq('user_id', userId);

  if (error) return { error: error.message };

  try {
    if (enabled) {
      await resumeComboGatewayBilling(supabase, row, billingTerm, plan);
    } else {
      await pauseComboGatewayBilling(row);
    }
  } catch (gatewayError) {
    console.error('[combo] setComboAutoRenew gateway:', gatewayError);
    await supabase
      .from('subscriptions')
      .update({
        combo_auto_renew: !enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);
    return {
      error: enabled
        ? 'Não foi possível reativar a renovação automática no gateway.'
        : 'Não foi possível pausar a cobrança no gateway. Tente novamente.',
    };
  }

  return {};
}

export async function scheduleComboSwitchToMonthly(
  supabase: SupabaseClient,
  subscriptionId: string,
  userId: string
): Promise<{ error?: string }> {
  const loaded = await loadComboSubscription(supabase, subscriptionId, userId);
  if ('error' in loaded) return loaded;

  const row = loaded.row;
  const plan = relOne(row.plans);
  if (!plan?.slug || plan.price_cents == null) {
    return { error: 'Plano não encontrado.' };
  }

  const prepaidUntil = parsePrepaidUntil(row.prepaid_until);
  if (!prepaidUntil || prepaidUntil <= new Date()) {
    return {
      error:
        'O pacote combo atual já terminou. Entre em contato com o suporte se precisar ajustar a cobrança.',
    };
  }

  const charge = await resolveSubscriptionRecurringCharge(supabase, plan, {
    promo_code: row.promo_code ?? null,
    shipping_cents: row.shipping_cents ?? null,
    special_notes: row.special_notes ?? null,
  });

  const { error } = await supabase
    .from('subscriptions')
    .update({
      combo_auto_renew: false,
      pending_billing_term: 'monthly',
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .eq('user_id', userId);

  if (error) return { error: error.message };

  try {
    if (row.pagarme_subscription_id && PAGARME_CONFIGURED) {
      await syncPagarmeSubscriptionMonthlyRecurring(
        row.pagarme_subscription_id,
        {
          localSubscriptionId: row.id,
          planName: plan.name,
          planSlug: plan.slug,
          monthlyTotalCents: charge.totalCents,
          nextBillingAt: prepaidUntil,
          pagarmeCustomerId: row.pagarme_customer_id,
          description: `DungeonBox — ${plan.name} (renovação mensal após combo)`,
        },
        supabase
      );
    } else if (row.asaas_subscription_id && ASAAS_CONFIGURED) {
      throw new Error('asaas_monthly_switch_unsupported');
    }
  } catch (gatewayError) {
    console.error('[combo] switch to monthly gateway:', gatewayError);
    await supabase
      .from('subscriptions')
      .update({
        combo_auto_renew: true,
        pending_billing_term: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId);
    return {
      error:
        'Não foi possível agendar a mensalidade no gateway. Tente de novo ou fale com o suporte.',
    };
  }

  return {};
}

export async function cancelComboSwitchToMonthly(
  supabase: SupabaseClient,
  subscriptionId: string,
  userId: string
): Promise<{ error?: string }> {
  const loaded = await loadComboSubscription(supabase, subscriptionId, userId);
  if ('error' in loaded) return loaded;

  const row = loaded.row;
  if (row.pending_billing_term !== 'monthly') {
    return { error: 'Não há mudança para mensal agendada.' };
  }

  const billingTerm = row.billing_term as Exclude<BillingTerm, 'monthly'>;
  const plan = relOne(row.plans);
  if (!plan?.name) return { error: 'Plano não encontrado.' };

  const { error } = await supabase
    .from('subscriptions')
    .update({
      pending_billing_term: null,
      combo_auto_renew: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId)
    .eq('user_id', userId);

  if (error) return { error: error.message };

  if (row.combo_auto_renew !== false) {
    try {
      await resumeComboGatewayBilling(supabase, row, billingTerm, plan);
    } catch (gatewayError) {
      console.error('[combo] cancel monthly switch gateway:', gatewayError);
      return {
        error:
          'Preferência salva, mas o gateway pode precisar de ajuste manual. Fale com o suporte se a cobrança não bater.',
      };
    }
  }

  return {};
}
