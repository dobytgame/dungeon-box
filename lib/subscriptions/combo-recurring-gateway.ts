import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAsaasPaymentDetails } from '@/lib/asaas/payment-details';
import { isAsaasPaymentConfirmed } from '@/lib/asaas/payment-status';
import { listAsaasSubscriptionPayments } from '@/lib/asaas/payment-sync';
import {
  cancelAsaasSubscriptionBestEffort,
} from '@/lib/asaas/subscription-api';
import { ASAAS_CONFIGURED, asaasRequest } from '@/lib/asaas/client';
import {
  isComboTerm,
  prepaidMonthsForTerm,
  type BillingTerm,
} from '@/lib/checkout/combo-billing';
import { resolveLatestPagarmeCustomerCardId } from '@/lib/pagarme/cards';
import { pagarmeRequest, PagarmeApiError } from '@/lib/pagarme/client';
import { truncatePagarmeItemDescription } from '@/lib/pagarme/item-description';
import { updatePagarmeSubscriptionBillingDate } from '@/lib/pagarme/change-billing-day';
import { cancelPagarmeSubscriptionBestEffort } from '@/lib/pagarme/subscription-api';

type PagarmeSubscriptionItem = {
  id?: string;
  status?: string;
  name?: string | null;
  description?: string | null;
  quantity?: number;
  pricing_scheme?: { scheme_type?: string; price?: number | null } | null;
};

type PagarmeSubscriptionDetail = {
  id: string;
  code?: string | null;
  status?: string;
  interval?: string;
  interval_count?: number;
  customer?: { id?: string } | string | null;
  card?: { id?: string } | null;
  next_billing_at?: string | null;
  start_at?: string | null;
  items?: PagarmeSubscriptionItem[];
};

type PagarmeSubscriptionCreateResponse = {
  id: string;
  next_billing_at?: string;
};

type AsaasSubscriptionDetails = {
  id: string;
  customer: string;
  value?: number;
  nextDueDate?: string | null;
  description?: string | null;
  status?: string;
  cycle?: string | null;
  creditCard?: { creditCardToken?: string | null } | null;
};

const DEFAULT_REMOTE_IP =
  process.env.ASAAS_DEFAULT_REMOTE_IP?.trim() || '127.0.0.1';

export type PagarmeComboSyncResult =
  | { status: 'already_aligned'; pagarmeSubscriptionId: string }
  | { status: 'billing_date_updated'; pagarmeSubscriptionId: string }
  | { status: 'recreated'; previousId: string; pagarmeSubscriptionId: string };

export type AsaasComboSyncResult =
  | { status: 'already_aligned'; asaasSubscriptionId: string }
  | { status: 'recreated'; previousId: string; asaasSubscriptionId: string }
  | { status: 'failed'; reason: string };

export function asaasCycleForComboTerm(
  term: Exclude<BillingTerm, 'monthly'>
): 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY' {
  if (term === 'combo_3') return 'QUARTERLY';
  if (term === 'combo_6') return 'SEMIANNUALLY';
  return 'YEARLY';
}

export function pagarmeIntervalCountForComboTerm(
  term: Exclude<BillingTerm, 'monthly'>
): number {
  return prepaidMonthsForTerm(term) ?? 3;
}

function formatPagarmeDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatAsaasDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function centsToReais(cents: number): number {
  return Math.round(cents) / 100;
}

function remoteValueCents(value?: number | null): number {
  return Math.round((value ?? 0) * 100);
}

function comboMonthsLabel(term: Exclude<BillingTerm, 'monthly'>): string {
  if (term === 'combo_3') return '3 meses';
  if (term === 'combo_6') return '6 meses';
  return '12 meses';
}

function comboItemDescription(
  planName: string,
  term: Exclude<BillingTerm, 'monthly'>
): string {
  return truncatePagarmeItemDescription(
    `DungeonBox — ${planName} (combo ${comboMonthsLabel(term)} · renovação automática)`
  );
}

async function fetchPagarmeSubscriptionDetail(
  pagarmeSubscriptionId: string
): Promise<PagarmeSubscriptionDetail> {
  return pagarmeRequest<PagarmeSubscriptionDetail>(
    `/subscriptions/${encodeURIComponent(pagarmeSubscriptionId)}`
  );
}

function pickPrimaryItem(items: PagarmeSubscriptionItem[]): PagarmeSubscriptionItem | null {
  const active = items.filter((item) => item.id);
  if (active.length === 0) return null;
  return active.reduce((best, item) => {
    const price = item.pricing_scheme?.price ?? 0;
    const bestPrice = best.pricing_scheme?.price ?? 0;
    return price >= bestPrice ? item : best;
  });
}

function itemUnitPriceCents(item: PagarmeSubscriptionItem | null): number {
  return Math.round(item?.pricing_scheme?.price ?? 0);
}

function resolvePagarmeCustomerId(
  remote: PagarmeSubscriptionDetail,
  fallback?: string | null
): string | null {
  if (typeof remote.customer === 'string') return remote.customer;
  if (remote.customer?.id) return remote.customer.id;
  return fallback?.trim() || null;
}

function pagarmeComboLooksAligned(
  remote: PagarmeSubscriptionDetail,
  billingTerm: Exclude<BillingTerm, 'monthly'>,
  comboTotalCents: number
): boolean {
  const expectedInterval = pagarmeIntervalCountForComboTerm(billingTerm);
  const interval = remote.interval_count ?? 1;
  const item = pickPrimaryItem(remote.items ?? []);
  const price = itemUnitPriceCents(item);
  return interval === expectedInterval && price === comboTotalCents;
}

async function patchPagarmeComboItemPrice(
  pagarmeSubscriptionId: string,
  remote: PagarmeSubscriptionDetail,
  input: {
    planName: string;
    billingTerm: Exclude<BillingTerm, 'monthly'>;
    comboTotalCents: number;
  }
): Promise<void> {
  const item = pickPrimaryItem(remote.items ?? []);
  if (!item?.id) {
    throw new Error('Item da assinatura Pagar.me não encontrado.');
  }

  await pagarmeRequest(
    `/subscriptions/${encodeURIComponent(pagarmeSubscriptionId)}/items/${encodeURIComponent(item.id)}`,
    {
      method: 'PUT',
      body: {
        status: item.status?.trim() || 'active',
        name: item.name ?? undefined,
        description: comboItemDescription(input.planName, input.billingTerm),
        quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
        pricing_scheme: {
          scheme_type: 'unit',
          price: input.comboTotalCents,
        },
      },
    }
  );
}

async function createPagarmeComboSubscription(input: {
  localSubscriptionId: string;
  pagarmeCustomerId: string;
  cardId: string;
  planName: string;
  planSlug?: string | null;
  billingTerm: Exclude<BillingTerm, 'monthly'>;
  comboTotalCents: number;
  startAt: Date;
}): Promise<PagarmeSubscriptionCreateResponse> {
  const intervalCount = pagarmeIntervalCountForComboTerm(input.billingTerm);

  return pagarmeRequest<PagarmeSubscriptionCreateResponse>('/subscriptions', {
    method: 'POST',
    body: {
      code: input.localSubscriptionId,
      payment_method: 'credit_card',
      currency: 'BRL',
      interval: 'month',
      interval_count: intervalCount,
      billing_type: 'prepaid',
      start_at: formatPagarmeDate(input.startAt),
      customer_id: input.pagarmeCustomerId,
      card_id: input.cardId,
      items: [
        {
          description: comboItemDescription(input.planName, input.billingTerm),
          quantity: 1,
          pricing_scheme: {
            scheme_type: 'unit',
            price: input.comboTotalCents,
          },
        },
      ],
      metadata: {
        subscription_id: input.localSubscriptionId,
        plan_slug: input.planSlug ?? undefined,
        billing_term: input.billingTerm,
        charge_kind: 'combo_recurring',
        combo_repair: 'true',
      },
    },
  });
}

/**
 * Alinha assinatura Pagar.me existente ao combo.
 * Assinaturas já iniciadas não aceitam PUT com start_at (405); recria quando intervalo/valor divergem.
 */
export async function syncPagarmeSubscriptionComboRecurring(
  pagarmeSubscriptionId: string,
  input: {
    localSubscriptionId: string;
    planName: string;
    planSlug?: string | null;
    billingTerm: Exclude<BillingTerm, 'monthly'>;
    comboTotalCents: number;
    nextBillingAt?: Date | null;
    pagarmeCustomerId?: string | null;
  },
  supabase?: SupabaseClient
): Promise<PagarmeComboSyncResult> {
  if (!isComboTerm(input.billingTerm)) {
    throw new Error('Termo de combo inválido.');
  }
  if (input.comboTotalCents <= 0) {
    throw new Error('Valor do combo inválido.');
  }

  const remote = await fetchPagarmeSubscriptionDetail(pagarmeSubscriptionId);
  const aligned = pagarmeComboLooksAligned(
    remote,
    input.billingTerm,
    input.comboTotalCents
  );

  if (aligned) {
    if (input.nextBillingAt) {
      try {
        await updatePagarmeSubscriptionBillingDate(
          pagarmeSubscriptionId,
          input.nextBillingAt
        );
        return { status: 'billing_date_updated', pagarmeSubscriptionId };
      } catch (error) {
        if (!(error instanceof PagarmeApiError) || error.status !== 412) {
          throw error;
        }
      }
    }
    return { status: 'already_aligned', pagarmeSubscriptionId };
  }

  const customerId = resolvePagarmeCustomerId(remote, input.pagarmeCustomerId);
  if (!customerId) {
    throw new Error('Cliente Pagar.me não encontrado na assinatura.');
  }

  let cardId =
    remote.card?.id?.trim() ||
    (await resolveLatestPagarmeCustomerCardId(customerId));
  if (!cardId) {
    throw new Error('Cartão Pagar.me não encontrado para recriar o combo.');
  }

  const startAt =
    input.nextBillingAt ??
    (remote.next_billing_at ? new Date(remote.next_billing_at) : new Date());

  await cancelPagarmeSubscriptionBestEffort(pagarmeSubscriptionId);

  const created = await createPagarmeComboSubscription({
    localSubscriptionId: input.localSubscriptionId,
    pagarmeCustomerId: customerId,
    cardId,
    planName: input.planName,
    planSlug: input.planSlug,
    billingTerm: input.billingTerm,
    comboTotalCents: input.comboTotalCents,
    startAt,
  });

  if (supabase) {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        pagarme_subscription_id: created.id,
        next_billing_date:
          created.next_billing_at ?? startAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.localSubscriptionId);

    if (error) {
      await cancelPagarmeSubscriptionBestEffort(created.id);
      throw new Error('Não foi possível vincular a nova assinatura Pagar.me.');
    }
  }

  return {
    status: 'recreated',
    previousId: pagarmeSubscriptionId,
    pagarmeSubscriptionId: created.id,
  };
}

/** Próxima cobrança mensal após combo (recria se intervalo ainda for de combo). */
export async function syncPagarmeSubscriptionMonthlyRecurring(
  pagarmeSubscriptionId: string,
  input: {
    localSubscriptionId: string;
    planName: string;
    planSlug?: string | null;
    monthlyTotalCents: number;
    nextBillingAt: Date;
    pagarmeCustomerId?: string | null;
    description?: string;
  },
  supabase?: SupabaseClient
): Promise<PagarmeComboSyncResult> {
  if (input.monthlyTotalCents <= 0) {
    throw new Error('Valor mensal inválido.');
  }

  const remote = await fetchPagarmeSubscriptionDetail(pagarmeSubscriptionId);
  const item = pickPrimaryItem(remote.items ?? []);
  const monthlyAligned =
    (remote.interval_count ?? 1) === 1 &&
    itemUnitPriceCents(item) === input.monthlyTotalCents;

  if (monthlyAligned) {
    try {
      await updatePagarmeSubscriptionBillingDate(
        pagarmeSubscriptionId,
        input.nextBillingAt
      );
      return { status: 'billing_date_updated', pagarmeSubscriptionId };
    } catch (error) {
      if (!(error instanceof PagarmeApiError) || error.status !== 412) {
        throw error;
      }
    }
    return { status: 'already_aligned', pagarmeSubscriptionId };
  }

  const customerId = resolvePagarmeCustomerId(remote, input.pagarmeCustomerId);
  if (!customerId) {
    throw new Error('Cliente Pagar.me não encontrado.');
  }

  const cardId =
    remote.card?.id?.trim() ||
    (await resolveLatestPagarmeCustomerCardId(customerId));
  if (!cardId) {
    throw new Error('Cartão Pagar.me não encontrado.');
  }

  await cancelPagarmeSubscriptionBestEffort(pagarmeSubscriptionId);

  const created = await pagarmeRequest<PagarmeSubscriptionCreateResponse>(
    '/subscriptions',
    {
      method: 'POST',
      body: {
        code: input.localSubscriptionId,
        payment_method: 'credit_card',
        currency: 'BRL',
        interval: 'month',
        interval_count: 1,
        billing_type: 'prepaid',
        start_at: formatPagarmeDate(input.nextBillingAt),
        customer_id: customerId,
        card_id: cardId,
        items: [
          {
            description: truncatePagarmeItemDescription(
              input.description ??
                `DungeonBox — ${input.planName} (renovação mensal após combo)`
            ),
            quantity: 1,
            pricing_scheme: {
              scheme_type: 'unit',
              price: input.monthlyTotalCents,
            },
          },
        ],
        metadata: {
          subscription_id: input.localSubscriptionId,
          charge_kind: 'combo_to_monthly',
        },
      },
    }
  );

  if (supabase) {
    await supabase
      .from('subscriptions')
      .update({
        pagarme_subscription_id: created.id,
        next_billing_date:
          created.next_billing_at ?? input.nextBillingAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.localSubscriptionId);
  }

  return {
    status: 'recreated',
    previousId: pagarmeSubscriptionId,
    pagarmeSubscriptionId: created.id,
  };
}

async function fetchAsaasSubscriptionDetails(
  asaasSubscriptionId: string
): Promise<AsaasSubscriptionDetails> {
  return asaasRequest<AsaasSubscriptionDetails>(
    `/subscriptions/${asaasSubscriptionId}`
  );
}

async function resolveAsaasCreditCardToken(
  remote: AsaasSubscriptionDetails,
  asaasSubscriptionId: string
): Promise<string | null> {
  const fromSubscription = remote.creditCard?.creditCardToken?.trim();
  if (fromSubscription) return fromSubscription;

  const payments = await listAsaasSubscriptionPayments(asaasSubscriptionId);
  for (const payment of payments) {
    if (!payment.id || !isAsaasPaymentConfirmed(payment.status)) continue;
    try {
      const details = await fetchAsaasPaymentDetails(payment.id);
      const token = (
        details as { creditCard?: { creditCardToken?: string | null } }
      ).creditCard?.creditCardToken?.trim();
      if (token) return token;
    } catch {
      continue;
    }
  }
  return null;
}

function asaasComboLooksAligned(
  remote: AsaasSubscriptionDetails,
  billingTerm: Exclude<BillingTerm, 'monthly'>,
  comboTotalCents: number
): boolean {
  return (
    remote.cycle === asaasCycleForComboTerm(billingTerm) &&
    remoteValueCents(remote.value) === comboTotalCents &&
    remote.status !== 'INACTIVE'
  );
}

/** Recria assinatura Asaas quando valor/ciclo não podem ser editados (faturas pagas). */
export async function syncAsaasSubscriptionComboRecurring(
  supabase: SupabaseClient,
  input: {
    localSubscriptionId: string;
    asaasSubscriptionId: string;
    asaasCustomerId: string;
    planName: string;
    billingTerm: Exclude<BillingTerm, 'monthly'>;
    comboTotalCents: number;
    nextDueDate: Date;
  }
): Promise<AsaasComboSyncResult> {
  if (!ASAAS_CONFIGURED) {
    return { status: 'failed', reason: 'asaas_not_configured' };
  }

  let remote: AsaasSubscriptionDetails;
  try {
    remote = await fetchAsaasSubscriptionDetails(input.asaasSubscriptionId);
  } catch {
    return { status: 'failed', reason: 'asaas_fetch_failed' };
  }

  if (
    asaasComboLooksAligned(remote, input.billingTerm, input.comboTotalCents)
  ) {
    return {
      status: 'already_aligned',
      asaasSubscriptionId: input.asaasSubscriptionId,
    };
  }

  const creditCardToken = await resolveAsaasCreditCardToken(
    remote,
    input.asaasSubscriptionId
  );
  if (!creditCardToken) {
    return { status: 'failed', reason: 'credit_card_token_unavailable' };
  }

  const previousId = input.asaasSubscriptionId;
  await cancelAsaasSubscriptionBestEffort(previousId);

  let created: { id: string };
  try {
    created = await asaasRequest<{ id: string }>('/subscriptions/', {
      method: 'POST',
      body: {
        customer: input.asaasCustomerId,
        billingType: 'CREDIT_CARD',
        cycle: asaasCycleForComboTerm(input.billingTerm),
        value: centsToReais(input.comboTotalCents),
        nextDueDate: formatAsaasDate(input.nextDueDate),
        description: `DungeonBox — ${input.planName} (renovação combo)`,
        externalReference: input.localSubscriptionId,
        creditCardToken,
        remoteIp: DEFAULT_REMOTE_IP,
      },
    });
  } catch (error) {
    console.error('[asaas] recreate combo subscription:', error);
    return { status: 'failed', reason: 'asaas_create_failed' };
  }

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      asaas_subscription_id: created.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.localSubscriptionId);

  if (updateError) {
    await cancelAsaasSubscriptionBestEffort(created.id);
    return { status: 'failed', reason: 'local_link_failed' };
  }

  return {
    status: 'recreated',
    previousId,
    asaasSubscriptionId: created.id,
  };
}
