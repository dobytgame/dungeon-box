import type { SupabaseClient } from '@supabase/supabase-js';
import { cancelAsaasSubscriptionBestEffort } from '@/lib/asaas/subscription-api';
import {
  extractBillingDay,
  resolveBillingDayAfterCatchUpCharge,
} from '@/lib/pagarme/billing-day';
import { resolveLatestPagarmeCustomerCardId } from '@/lib/pagarme/cards';
import { PAGARME_CONFIGURED, pagarmeRequest } from '@/lib/pagarme/client';
import { userFacingPagarmeError } from '@/lib/pagarme/errors';
import {
  assertPagarmeCreditCardOrderPaid,
  chargePagarmeOneTimeOrder,
  isPagarmeChargePaid,
  resolvePagarmeOrderChargeIds,
} from '@/lib/pagarme/one-time-order';
import { buildBillingAddress } from '@/lib/pagarme/subscription-checkout';
import {
  migrationNeedsImmediateCharge,
  resolveMigrationCatchUpStartAt,
} from '@/lib/pagarme/migration-schedule';
import { cancelOpenPagarmeSubscriptionInvoices } from '@/lib/pagarme/subscription-api';
import { syncLatestPagarmeCardToSubscription } from '@/lib/pagarme/sync-subscription-card';
import { processActiveSubscriptionPayment } from '@/lib/subscriptions/cycles';
import {
  resolveSubscriptionRecurringCharge,
  type PlanChargeRow,
  type RecurringChargeBreakdown,
} from '@/lib/subscriptions/recurring-charge';

type PagarmeChargeCard = {
  id?: string | null;
  last_four_digits?: string | null;
  brand?: string | null;
};

type PagarmeCharge = {
  id?: string;
  status?: string;
  amount?: number;
  card?: PagarmeChargeCard | null;
  last_transaction?: {
    status?: string;
    acquirer_message?: string | null;
    card?: PagarmeChargeCard | null;
  } | null;
};

type PagarmeInvoice = {
  id?: string;
  status?: string;
  amount?: number;
  subscription_id?: string;
  charge?: PagarmeCharge | null;
  due_at?: string | null;
  created_at?: string | null;
};

type PagarmeInvoiceList = {
  data?: PagarmeInvoice[];
};

type PagarmeCycleResponse = {
  id?: string;
  status?: string;
  billing_at?: string;
  start_at?: string;
  end_at?: string;
};

type PagarmeRemoteSubscription = {
  id?: string;
  status?: string;
  start_at?: string | null;
  next_billing_at?: string | null;
  card?: {
    id?: string | null;
    last_four_digits?: string | null;
    brand?: string | null;
  } | null;
  customer?: { id?: string | null } | null;
};

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function chargeStatus(charge?: PagarmeCharge | null): string {
  return (
    charge?.status?.trim().toLowerCase() ||
    charge?.last_transaction?.status?.trim().toLowerCase() ||
    ''
  );
}

function chargeCardId(charge?: PagarmeCharge | null): string | null {
  return (
    charge?.card?.id?.trim() ||
    charge?.last_transaction?.card?.id?.trim() ||
    null
  );
}

function isRetryableChargeStatus(status: string): boolean {
  return (
    status === 'failed' ||
    status === 'canceled' ||
    status === 'cancelled' ||
    status === 'not_authorized' ||
    status === 'pending' ||
    status === 'processing'
  );
}

async function listSubscriptionInvoices(
  pagarmeSubscriptionId: string
): Promise<PagarmeInvoice[]> {
  const listed = await pagarmeRequest<PagarmeInvoiceList>(
    `/invoices?subscription_id=${encodeURIComponent(pagarmeSubscriptionId)}&size=20&page=1`
  );
  return listed.data ?? [];
}

async function resolveChargeCardId(chargeId: string): Promise<string | null> {
  const charge = await pagarmeRequest<PagarmeCharge>(
    `/charges/${encodeURIComponent(chargeId)}`
  );
  return chargeCardId(charge);
}

function cardInfoFromCharge(charge?: PagarmeCharge | null): ChargePagarmeNowCardInfo | null {
  const card = charge?.card ?? charge?.last_transaction?.card;
  if (!card?.last_four_digits && !card?.brand) return null;
  return {
    last4: card.last_four_digits?.trim() || null,
    brand: card.brand?.trim() || null,
    synced: false,
  };
}

function formatPagarmeDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function updateFutureSubscriptionStart(
  pagarmeSubscriptionId: string,
  nextBillingAt: Date
): Promise<void> {
  const bodyDate = formatPagarmeDate(nextBillingAt);
  try {
    await pagarmeRequest(
      `/subscriptions/${encodeURIComponent(pagarmeSubscriptionId)}/billing-date`,
      { method: 'PATCH', body: { next_billing_at: bodyDate } }
    );
    return;
  } catch (error) {
    console.warn(
      '[pagarme] billing-date patch on future subscription failed, trying start-at:',
      pagarmeSubscriptionId,
      error instanceof Error ? error.message : error
    );
  }

  await pagarmeRequest(
    `/subscriptions/${encodeURIComponent(pagarmeSubscriptionId)}/start-at`,
    { method: 'PATCH', body: { start_at: bodyDate } }
  );
}

/** Cobrança avulsa no cartão da assinatura (migração, atraso ou fatura antiga inválida). */
async function chargeSubscriptionCatchUpNow(input: {
  admin: SupabaseClient;
  subscriptionId: string;
  pagarmeSubscriptionId: string;
  userId: string;
  addressId: string | null;
  pagarmeCustomerId: string | null;
  startedAt: string | null;
  nextBillingDate: string | null;
  asaasSubscriptionId: string | null;
  currentCycle: number | null;
  charge: RecurringChargeBreakdown;
  remote: PagarmeRemoteSubscription;
  cardId?: string | null;
  nextBillingAt?: Date;
}): Promise<ChargePagarmeSubscriptionNowResult> {
  if (input.charge.totalCents <= 0) {
    return { status: 'error', error: 'Valor da cobrança inválido.', statusCode: 422 };
  }

  const pagarmeCustomerId =
    input.pagarmeCustomerId?.trim() ||
    input.remote.customer?.id?.trim() ||
    null;
  if (!pagarmeCustomerId) {
    return {
      status: 'error',
      error: 'Assinatura sem cliente Pagar.me para cobrar agora.',
      statusCode: 422,
    };
  }

  const cardId =
    input.cardId?.trim() ||
    input.remote.card?.id?.trim() ||
    (await resolveLatestPagarmeCustomerCardId(pagarmeCustomerId));
  if (!cardId) {
    return {
      status: 'error',
      error: 'Assinatura sem cartão salvo no Pagar.me.',
      statusCode: 422,
    };
  }

  if (!input.addressId) {
    return {
      status: 'error',
      error: 'Assinatura sem endereço para a cobrança.',
      statusCode: 422,
    };
  }

  const { data: address } = await input.admin
    .from('addresses')
    .select(
      'recipient, zip_code, street, number, complement, neighborhood, city, state'
    )
    .eq('id', input.addressId)
    .maybeSingle();

  if (!address) {
    return {
      status: 'error',
      error: 'Endereço da assinatura não encontrado.',
      statusCode: 422,
    };
  }

  const billingDay =
    extractBillingDay(input.startedAt) ??
    extractBillingDay(input.nextBillingDate) ??
    19;
  const nextBillingAt =
    input.nextBillingAt ?? resolveBillingDayAfterCatchUpCharge(billingDay);
  const nextBillingIso = nextBillingAt.toISOString();
  const orderCode = `${input.subscriptionId}-cu-${Date.now().toString(36)}`;

  const order = await chargePagarmeOneTimeOrder({
    customerId: pagarmeCustomerId,
    valueCents: input.charge.totalCents,
    description: `${input.charge.description} (regularização)`,
    cardId,
    billingAddress: buildBillingAddress(address),
    orderCode,
    metadata: {
      subscription_id: input.subscriptionId,
      charge_kind: 'subscription_catchup',
    },
  });

  assertPagarmeCreditCardOrderPaid(
    order,
    'Cobrança recusada. Verifique o cartão no Pagar.me e tente novamente.'
  );

  const ids = resolvePagarmeOrderChargeIds(order);
  const nowIso = new Date().toISOString();
  const paid = isPagarmeChargePaid(ids.chargeStatus);

  const paymentPayload = {
    user_id: input.userId,
    subscription_id: input.subscriptionId,
    pagarme_order_id: order.id,
    amount_cents: input.charge.totalCents,
    currency: 'BRL',
    status: paid ? ('approved' as const) : ('pending' as const),
    paid_at: paid ? nowIso : null,
    installments: 1,
    payment_method: 'credit_card',
    status_detail: JSON.stringify({
      type: 'subscription_catchup',
      gateway: 'pagarme',
    }),
  };

  const { data: paymentRow, error: paymentError } = ids.chargeId
    ? await input.admin
        .from('payments')
        .upsert(
          { ...paymentPayload, pagarme_charge_id: ids.chargeId },
          { onConflict: 'pagarme_charge_id' }
        )
        .select('id, amount_cents')
        .single()
    : await input.admin
        .from('payments')
        .insert(paymentPayload)
        .select('id, amount_cents')
        .single();

  if (paymentError || !paymentRow) {
    console.error(
      '[pagarme] catch-up payment row:',
      input.subscriptionId,
      paymentError?.message
    );
    return {
      status: 'error',
      error:
        'Cobrança aprovada no Pagar.me, mas falhou ao registrar o pagamento local. Contate o suporte.',
      statusCode: 502,
    };
  }

  if (paid) {
    await processActiveSubscriptionPayment(
      input.admin,
      input.subscriptionId,
      input.currentCycle,
      {
        id: paymentRow.id,
        amount_cents: paymentRow.amount_cents,
        paid_at: nowIso,
      },
      nextBillingIso
    );
  }

  try {
    await updateFutureSubscriptionStart(input.pagarmeSubscriptionId, nextBillingAt);
  } catch (error) {
    console.error(
      '[pagarme] catch-up charged but failed to reschedule start_at:',
      input.subscriptionId,
      error
    );
  }

  await input.admin
    .from('subscriptions')
    .update({
      next_billing_date: nextBillingIso,
      current_period_end: nextBillingIso,
      updated_at: nowIso,
      ...(input.asaasSubscriptionId
        ? { asaas_subscription_id: null, asaas_customer_id: null }
        : {}),
    })
    .eq('id', input.subscriptionId);

  if (input.asaasSubscriptionId) {
    await cancelAsaasSubscriptionBestEffort(input.asaasSubscriptionId);
  }

  if (!paid) {
    return {
      status: 'pending',
      mode: 'catchup',
      amountCents: input.charge.totalCents,
      expectedCents: input.charge.totalCents,
      promoSummary: input.charge.promoSummary,
      chargeId: ids.chargeId,
      chargeStatus: ids.chargeStatus,
      invoiceId: null,
      cycleId: null,
      message:
        'Cobrança enviada (avulsa). Acompanhe a confirmação no Pagar.me / webhooks.',
      card: null,
    };
  }

  return {
    status: 'charged',
    mode: 'catchup',
    amountCents: input.charge.totalCents,
    expectedCents: input.charge.totalCents,
    promoSummary: input.charge.promoSummary,
    chargeId: ids.chargeId,
    chargeStatus: ids.chargeStatus || 'paid',
    invoiceId: null,
    cycleId: null,
    acquirerMessage: null,
    card: null,
  };
}

function pickRetryableInvoice(invoices: PagarmeInvoice[]): PagarmeInvoice | null {
  const ranked = invoices
    .filter((invoice) => {
      const invoiceStatus = invoice.status?.trim().toLowerCase() ?? '';
      if (invoiceStatus === 'paid' || invoiceStatus === 'canceled') return false;
      const charge = invoice.charge;
      if (!charge?.id) return false;
      return isRetryableChargeStatus(chargeStatus(charge));
    })
    .sort((a, b) =>
      String(b.created_at ?? b.due_at ?? '').localeCompare(
        String(a.created_at ?? a.due_at ?? '')
      )
    );

  return ranked[0] ?? null;
}

export type ChargePagarmeNowCardInfo = {
  last4: string | null;
  brand: string | null;
  synced: boolean;
};

export type ChargePagarmeSubscriptionNowResult =
  | {
      status: 'charged';
      mode: 'retry' | 'renew' | 'catchup';
      amountCents: number | null;
      expectedCents: number;
      promoSummary: string | null;
      chargeId: string | null;
      chargeStatus: string | null;
      invoiceId: string | null;
      cycleId: string | null;
      acquirerMessage: string | null;
      card: ChargePagarmeNowCardInfo | null;
    }
  | {
      status: 'pending';
      mode: 'retry' | 'renew' | 'catchup';
      amountCents: number | null;
      expectedCents: number;
      promoSummary: string | null;
      chargeId: string | null;
      chargeStatus: string | null;
      invoiceId: string | null;
      cycleId: string | null;
      message: string;
      card: ChargePagarmeNowCardInfo | null;
    }
  | { status: 'error'; error: string; statusCode?: number };

/**
 * Cobra agora uma assinatura Pagar.me (atraso/falha):
 * 0) confere a carteira e anexa o cartão mais recente se o cliente atualizou;
 * 1) tenta reprocessar a última fatura/cobrança pendente ou falha (só se o cartão
 *    da fatura ainda for o atual — fatura antiga fica presa no cartão recusado);
 * 2) se a assinatura ainda é `future` (migração agendada), cobra avulso no cartão
 *    salvo e remarca o start_at para o próximo dia de vencimento;
 * 3) senão, renova o ciclo (`POST /subscriptions/{id}/cycles`).
 */
export async function chargePagarmeSubscriptionNow(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<ChargePagarmeSubscriptionNowResult> {
  if (!PAGARME_CONFIGURED) {
    return { status: 'error', error: 'Pagar.me não configurado.', statusCode: 503 };
  }

  const { data: subscription } = await admin
    .from('subscriptions')
    .select(
      `
      id,
      user_id,
      status,
      current_cycle,
      started_at,
      next_billing_date,
      address_id,
      promo_code,
      shipping_cents,
      special_notes,
      pagarme_subscription_id,
      pagarme_customer_id,
      card_last4,
      card_brand,
      asaas_subscription_id,
      is_partner,
      plans!plan_id(name, slug, price_cents)
    `
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription) {
    return { status: 'error', error: 'Assinatura não encontrada.', statusCode: 404 };
  }

  if (subscription.is_partner) {
    return {
      status: 'error',
      error: 'Assinatura de parceiro não possui cobrança.',
      statusCode: 422,
    };
  }

  if (!subscription.pagarme_subscription_id) {
    return {
      status: 'error',
      error: 'Assinatura sem vínculo Pagar.me.',
      statusCode: 422,
    };
  }

  const plan = relOne(subscription.plans as PlanChargeRow | PlanChargeRow[] | null);
  if (!plan?.slug || plan.price_cents == null) {
    return { status: 'error', error: 'Plano da assinatura não encontrado.', statusCode: 404 };
  }

  const charge = await resolveSubscriptionRecurringCharge(admin, plan, {
    promo_code: subscription.promo_code,
    shipping_cents: subscription.shipping_cents,
    special_notes: subscription.special_notes,
  });

  try {
    const remote = await pagarmeRequest<PagarmeRemoteSubscription>(
      `/subscriptions/${encodeURIComponent(subscription.pagarme_subscription_id)}`
    );
    const pagarmeCustomerId =
      (subscription.pagarme_customer_id as string | null)?.trim() ||
      remote.customer?.id?.trim() ||
      null;
    if (!pagarmeCustomerId) {
      return {
        status: 'error',
        error: 'Assinatura sem cliente Pagar.me para validar o cartão.',
        statusCode: 422,
      };
    }

    const cardSync = await syncLatestPagarmeCardToSubscription({
      admin,
      subscriptionId,
      pagarmeSubscriptionId: subscription.pagarme_subscription_id,
      pagarmeCustomerId,
      currentRemoteCardId: remote.card?.id,
      currentRemoteLast4: remote.card?.last_four_digits,
      currentRemoteBrand: remote.card?.brand,
    });
    if ('error' in cardSync) {
      return { status: 'error', error: cardSync.error, statusCode: 422 };
    }

    const card: ChargePagarmeNowCardInfo = {
      last4: cardSync.last4,
      brand: cardSync.brand,
      synced: cardSync.synced,
    };

    const invoices = await listSubscriptionInvoices(
      subscription.pagarme_subscription_id
    );
    const retryInvoice = pickRetryableInvoice(invoices);
    const retryChargeId = retryInvoice?.charge?.id?.trim() || null;
    let retryCardId = chargeCardId(retryInvoice?.charge);
    if (retryChargeId && !retryCardId) {
      try {
        retryCardId = await resolveChargeCardId(retryChargeId);
      } catch (error) {
        console.warn(
          '[pagarme] could not resolve charge card before retry:',
          subscriptionId,
          error instanceof Error ? error.message : error
        );
      }
    }

    const localLast4 = (subscription.card_last4 as string | null)?.trim() || null;
    const canRetrySameCard =
      Boolean(retryChargeId) &&
      Boolean(retryCardId) &&
      retryCardId === cardSync.cardId;

    if (retryChargeId && !canRetrySameCard && retryInvoice) {
      try {
        await cancelOpenPagarmeSubscriptionInvoices(
          subscription.pagarme_subscription_id
        );
      } catch (error) {
        console.warn(
          '[pagarme] cancel stale invoices before renew:',
          subscriptionId,
          error instanceof Error ? error.message : error
        );
      }
    }

    if (retryChargeId && canRetrySameCard && retryInvoice?.charge) {
      const failedInvoice = retryInvoice;
      const failedCharge = failedInvoice.charge!;
      const retried = await pagarmeRequest<PagarmeCharge>(
        `/charges/${encodeURIComponent(retryChargeId)}/retry`,
        { method: 'POST' }
      );

      const chargedCard = cardInfoFromCharge(retried) ?? card;
      const status = chargeStatus(retried) || chargeStatus(failedCharge);
      const amountCents = Math.round(
        retried.amount ?? failedCharge.amount ?? failedInvoice.amount ?? 0
      );
      const paid = isPagarmeChargePaid(status);

      if (paid) {
        return {
          status: 'charged',
          mode: 'retry',
          amountCents: amountCents || charge.totalCents,
          expectedCents: charge.totalCents,
          promoSummary: charge.promoSummary,
          chargeId: retried.id ?? failedCharge.id ?? null,
          chargeStatus: status || 'paid',
          invoiceId: failedInvoice.id ?? null,
          cycleId: null,
          acquirerMessage:
            retried.last_transaction?.acquirer_message?.trim() || null,
          card: chargedCard,
        };
      }

      const acquirerMessage =
        retried.last_transaction?.acquirer_message?.trim() || null;
      const chargedLast4 = chargedCard?.last4?.trim() || null;
      const mismatchNote =
        localLast4 && chargedLast4 && localLast4 !== chargedLast4
          ? ` Cobrança usou •••• ${chargedLast4} (cadastro local •••• ${localLast4}). Peça nova troca de cartão e cobre de novo.`
          : '';

      return {
        status: 'pending',
        mode: 'retry',
        amountCents: amountCents || charge.totalCents,
        expectedCents: charge.totalCents,
        promoSummary: charge.promoSummary,
        chargeId: retried.id ?? retryChargeId,
        chargeStatus: status || null,
        invoiceId: failedInvoice.id ?? null,
        cycleId: null,
        message:
          (acquirerMessage ||
            'Reprocessamento enviado. Acompanhe o status da cobrança no Pagar.me / webhooks.') +
          mismatchNote,
        card: chargedCard,
      };
    }

    const remoteStatus = (remote.status ?? '').trim().toLowerCase();
    const subscriptionStatus = (subscription.status as string | null)?.trim() ?? '';
    const nextBillingDate = (subscription.next_billing_date as string | null) ?? null;
    const needsImmediateCharge = migrationNeedsImmediateCharge({
      status: subscriptionStatus,
      nextBillingDate,
    });
    const skippedStaleRetry = Boolean(retryChargeId && !canRetrySameCard);

    if (remoteStatus === 'future' || needsImmediateCharge || skippedStaleRetry) {
      const nextBillingAt =
        needsImmediateCharge && nextBillingDate
          ? resolveMigrationCatchUpStartAt(nextBillingDate)
          : undefined;
      const catchup = await chargeSubscriptionCatchUpNow({
        admin,
        subscriptionId,
        pagarmeSubscriptionId: subscription.pagarme_subscription_id,
        userId: subscription.user_id as string,
        addressId: (subscription.address_id as string | null) ?? null,
        pagarmeCustomerId,
        startedAt: (subscription.started_at as string | null) ?? null,
        nextBillingDate,
        asaasSubscriptionId:
          (subscription.asaas_subscription_id as string | null) ?? null,
        currentCycle: (subscription.current_cycle as number | null) ?? null,
        charge,
        remote,
        cardId: cardSync.cardId,
        nextBillingAt,
      });
      if (catchup.status === 'error') return catchup;
      return { ...catchup, card: catchup.card ?? card };
    }

    const cycle = await pagarmeRequest<PagarmeCycleResponse>(
      `/subscriptions/${encodeURIComponent(subscription.pagarme_subscription_id)}/cycles`,
      { method: 'POST' }
    );

    // Após renovar, a fatura/cobrança costuma aparecer em seguida.
    let latestChargeId: string | null = null;
    let latestChargeStatus: string | null = null;
    let latestInvoiceId: string | null = null;
    let latestAmount: number | null = null;
    let acquirerMessage: string | null = null;

    try {
      const refreshed = await listSubscriptionInvoices(
        subscription.pagarme_subscription_id
      );
      const newest = [...refreshed].sort((a, b) =>
        String(b.created_at ?? '').localeCompare(String(a.created_at ?? ''))
      )[0];
      if (newest) {
        latestInvoiceId = newest.id ?? null;
        latestAmount = Math.round(newest.amount ?? newest.charge?.amount ?? 0) || null;
        latestChargeId = newest.charge?.id ?? null;
        latestChargeStatus = chargeStatus(newest.charge) || newest.status || null;
        acquirerMessage =
          newest.charge?.last_transaction?.acquirer_message?.trim() || null;
      }
    } catch {
      // ignore refresh errors; renew already succeeded at gateway
    }

    if (isPagarmeChargePaid(latestChargeStatus)) {
      return {
        status: 'charged',
        mode: 'renew',
        amountCents: latestAmount ?? charge.totalCents,
        expectedCents: charge.totalCents,
        promoSummary: charge.promoSummary,
        chargeId: latestChargeId,
        chargeStatus: latestChargeStatus,
        invoiceId: latestInvoiceId,
        cycleId: cycle.id ?? null,
        acquirerMessage,
        card,
      };
    }

    return {
      status: 'pending',
      mode: 'renew',
      amountCents: latestAmount ?? charge.totalCents,
      expectedCents: charge.totalCents,
      promoSummary: charge.promoSummary,
      chargeId: latestChargeId,
      chargeStatus: latestChargeStatus,
      invoiceId: latestInvoiceId,
      cycleId: cycle.id ?? null,
      message:
        acquirerMessage ||
        'Ciclo renovado, mas nenhuma cobrança paga foi confirmada. Se a assinatura estiver em atraso, o botão passará a usar cobrança avulsa no cartão atual.',
      card,
    };
  } catch (error) {
    console.error('[pagarme] manual charge:', subscriptionId, error);
    return {
      status: 'error',
      error: userFacingPagarmeError(error),
      statusCode: 502,
    };
  }
}
