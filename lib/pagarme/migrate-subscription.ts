import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanSlug } from '@/lib/checkout/plans';
import { getOrCreatePagarmeCustomer } from '@/lib/pagarme/customer';
import { pagarmeRequest } from '@/lib/pagarme/client';
import { resolveLatestPagarmeCustomerCardId } from '@/lib/pagarme/cards';
import {
  buildPagarmeMigrationCatchUpCode,
  migrationNeedsImmediateCharge,
  resolveMigrationCatchUpStartAt,
  resolveMigrationStartAt,
} from '@/lib/pagarme/migration-schedule';
import {
  assertPagarmeCreditCardOrderPaid,
  chargePagarmeOneTimeOrder,
  isPagarmeChargePaid,
  resolvePagarmeOrderCardId,
  resolvePagarmeOrderChargeIds,
} from '@/lib/pagarme/one-time-order';
import { buildPagarmeSubscriptionCardPayload } from '@/lib/pagarme/subscription-card-payload';
import type { PagarmeBillingAddressInput } from '@/lib/pagarme/subscription-checkout';
import { cancelPagarmeSubscriptionBestEffort } from '@/lib/pagarme/subscription-api';
import { ensureSubscriptionCycle } from '@/lib/subscriptions/cycles';

export {
  buildPagarmeMigrationCatchUpCode,
  migrationNeedsImmediateCharge,
  resolveMigrationCatchUpStartAt,
  resolveMigrationStartAt,
} from '@/lib/pagarme/migration-schedule';

type PagarmeSubscriptionResponse = {
  id: string;
  status?: string;
  next_billing_at?: string;
  start_at?: string;
};

function formatPagarmeDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function resolveCardIdAfterTokenCharge(input: {
  order: Awaited<ReturnType<typeof chargePagarmeOneTimeOrder>>;
  customerId: string;
}): Promise<string> {
  const fromOrder = await resolvePagarmeOrderCardId(input.order);
  if (fromOrder) return fromOrder;

  const fromWallet = await resolveLatestPagarmeCustomerCardId(input.customerId);
  if (fromWallet) return fromWallet;

  throw new Error(
    'Pagamento aprovado, mas não foi possível vincular o cartão à renovação. Contate o suporte.'
  );
}

export async function attachPagarmeSubscriptionToExisting(input: {
  supabase: SupabaseClient;
  subscriptionId: string;
  userId: string;
  planSlug: PlanSlug;
  planName: string;
  priceCents: number;
  cardToken: string;
  cardLast4: string;
  cardBrand: string;
  billingAddress: PagarmeBillingAddressInput;
  /** Data da próxima cobrança Asaas — usada como start_at no Pagar.me. */
  nextBillingDate?: string | null;
  /** past_due / vencido: cobra ciclo atual agora e agenda a próxima. */
  chargeImmediately?: boolean;
  subscriptionStatus?: string | null;
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    cpf: string | null;
    phone: string | null;
    pagarme_customer_id: string | null;
  };
  address: {
    recipient: string;
    zip_code: string;
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
  };
}) {
  const chargeImmediately =
    input.chargeImmediately ??
    migrationNeedsImmediateCharge({
      status: input.subscriptionStatus,
      nextBillingDate: input.nextBillingDate,
    });

  const pagarmeCustomerId = await getOrCreatePagarmeCustomer(
    input.supabase,
    input.profile,
    input.address
  );

  if (chargeImmediately) {
    return attachWithImmediateCatchUp({
      ...input,
      pagarmeCustomerId,
    });
  }

  return attachDeferredOnly({
    ...input,
    pagarmeCustomerId,
  });
}

async function attachDeferredOnly(input: {
  supabase: SupabaseClient;
  subscriptionId: string;
  userId: string;
  planSlug: PlanSlug;
  planName: string;
  priceCents: number;
  cardToken: string;
  cardLast4: string;
  cardBrand: string;
  billingAddress: PagarmeBillingAddressInput;
  nextBillingDate?: string | null;
  pagarmeCustomerId: string;
}) {
  const startAt = resolveMigrationStartAt(input.nextBillingDate);

  const pagarmeSubscription = await pagarmeRequest<PagarmeSubscriptionResponse>(
    '/subscriptions',
    {
      method: 'POST',
      body: {
        code: input.subscriptionId,
        payment_method: 'credit_card',
        currency: 'BRL',
        interval: 'month',
        interval_count: 1,
        billing_type: 'prepaid',
        start_at: formatPagarmeDate(startAt),
        customer_id: input.pagarmeCustomerId,
        ...buildPagarmeSubscriptionCardPayload({
          cardToken: input.cardToken,
          billingAddress: input.billingAddress,
        }),
        items: [
          {
            description: `DungeonBox — ${input.planName}`,
            quantity: 1,
            pricing_scheme: {
              scheme_type: 'unit',
              price: input.priceCents,
            },
          },
        ],
        metadata: {
          subscription_id: input.subscriptionId,
          plan_slug: input.planSlug,
          migrated_from: 'asaas',
          deferred_start: 'true',
        },
      },
    }
  );

  const now = new Date().toISOString();
  const nextBilling =
    pagarmeSubscription.next_billing_at ??
    pagarmeSubscription.start_at ??
    startAt.toISOString();

  const { error } = await input.supabase
    .from('subscriptions')
    .update({
      pagarme_subscription_id: pagarmeSubscription.id,
      pagarme_customer_id: input.pagarmeCustomerId,
      card_last4: input.cardLast4,
      card_brand: input.cardBrand,
      next_billing_date: nextBilling,
      migrated_to_pagarme_at: now,
      updated_at: now,
    })
    .eq('id', input.subscriptionId)
    .eq('user_id', input.userId);

  if (error) {
    await cancelPagarmeSubscriptionBestEffort(pagarmeSubscription.id);
    throw new Error('Não foi possível vincular a assinatura ao Pagar.me.');
  }

  return {
    pagarmeSubscriptionId: pagarmeSubscription.id,
    pagarmeCustomerId: input.pagarmeCustomerId,
    startAt,
    nextBillingDate: nextBilling,
    chargedImmediately: false as const,
    amountChargedCents: null,
  };
}

async function attachWithImmediateCatchUp(input: {
  supabase: SupabaseClient;
  subscriptionId: string;
  userId: string;
  planSlug: PlanSlug;
  planName: string;
  priceCents: number;
  cardToken: string;
  cardLast4: string;
  cardBrand: string;
  billingAddress: PagarmeBillingAddressInput;
  nextBillingDate?: string | null;
  pagarmeCustomerId: string;
}) {
  if (input.priceCents <= 0) {
    throw new Error('Valor da cobrança em atraso inválido.');
  }

  const catchUpOrder = await chargePagarmeOneTimeOrder({
    customerId: input.pagarmeCustomerId,
    valueCents: input.priceCents,
    description: `DungeonBox — Regularização (${input.planName})`,
    cardToken: input.cardToken,
    billingAddress: input.billingAddress,
    orderCode: buildPagarmeMigrationCatchUpCode(input.subscriptionId),
    metadata: {
      subscription_id: input.subscriptionId,
      charge_kind: 'migration_catchup',
      plan_slug: input.planSlug,
      migrated_from: 'asaas',
    },
  });

  assertPagarmeCreditCardOrderPaid(
    catchUpOrder,
    'Pagamento em atraso recusado. Verifique os dados do cartão e tente novamente.'
  );

  const chargeIds = resolvePagarmeOrderChargeIds(catchUpOrder);
  const catchUpPaid = isPagarmeChargePaid(chargeIds.chargeStatus);
  const savedCardId = await resolveCardIdAfterTokenCharge({
    order: catchUpOrder,
    customerId: input.pagarmeCustomerId,
  });

  const startAt = resolveMigrationCatchUpStartAt(input.nextBillingDate);
  const now = new Date();
  const nowIso = now.toISOString();

  const paymentPayload = {
    user_id: input.userId,
    subscription_id: input.subscriptionId,
    pagarme_order_id: catchUpOrder.id,
    amount_cents: input.priceCents,
    currency: 'BRL',
    status: catchUpPaid ? ('approved' as const) : ('pending' as const),
    paid_at: catchUpPaid ? nowIso : null,
    installments: 1,
    payment_method: 'credit_card',
    status_detail: JSON.stringify({
      type: 'migration_catchup',
      gateway: 'pagarme',
      migrated_from: 'asaas',
    }),
  };

  if (chargeIds.chargeId) {
    const { error: paymentError } = await input.supabase.from('payments').upsert(
      {
        ...paymentPayload,
        pagarme_charge_id: chargeIds.chargeId,
      },
      { onConflict: 'pagarme_charge_id' }
    );
    if (paymentError) {
      console.error(
        '[pagarme] migration catch-up payment row:',
        input.subscriptionId,
        paymentError.message
      );
    }
  } else {
    const { error: paymentError } = await input.supabase
      .from('payments')
      .insert(paymentPayload);
    if (paymentError) {
      console.error(
        '[pagarme] migration catch-up payment row:',
        input.subscriptionId,
        paymentError.message
      );
    }
  }

  let pagarmeSubscription: PagarmeSubscriptionResponse;
  try {
    pagarmeSubscription = await pagarmeRequest<PagarmeSubscriptionResponse>(
      '/subscriptions',
      {
        method: 'POST',
        body: {
          code: input.subscriptionId,
          payment_method: 'credit_card',
          currency: 'BRL',
          interval: 'month',
          interval_count: 1,
          billing_type: 'prepaid',
          start_at: formatPagarmeDate(startAt),
          customer_id: input.pagarmeCustomerId,
          ...buildPagarmeSubscriptionCardPayload({
            cardId: savedCardId,
            billingAddress: input.billingAddress,
          }),
          items: [
            {
              description: `DungeonBox — ${input.planName}`,
              quantity: 1,
              pricing_scheme: {
                scheme_type: 'unit',
                price: input.priceCents,
              },
            },
          ],
          metadata: {
            subscription_id: input.subscriptionId,
            plan_slug: input.planSlug,
            migrated_from: 'asaas',
            deferred_start: 'true',
            catchup_paid: 'true',
          },
        },
      }
    );
  } catch (error) {
    console.error(
      '[pagarme] migration catch-up: payment ok but subscription failed',
      input.subscriptionId,
      error
    );
    throw new Error(
      'Pagamento da fatura em atraso foi aprovado, mas não foi possível agendar as próximas cobranças. Contate o suporte com o comprovante.'
    );
  }

  const nextBilling =
    pagarmeSubscription.next_billing_at ??
    pagarmeSubscription.start_at ??
    startAt.toISOString();

  const { error } = await input.supabase
    .from('subscriptions')
    .update({
      pagarme_subscription_id: pagarmeSubscription.id,
      pagarme_customer_id: input.pagarmeCustomerId,
      card_last4: input.cardLast4,
      card_brand: input.cardBrand,
      next_billing_date: nextBilling,
      migrated_to_pagarme_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', input.subscriptionId)
    .eq('user_id', input.userId);

  if (error) {
    await cancelPagarmeSubscriptionBestEffort(pagarmeSubscription.id);
    throw new Error('Não foi possível vincular a assinatura ao Pagar.me.');
  }

  const { data: localSub } = await input.supabase
    .from('subscriptions')
    .select('status, current_cycle')
    .eq('id', input.subscriptionId)
    .maybeSingle();

  if (
    localSub?.status === 'past_due' ||
    localSub?.status === 'paused' ||
    localSub?.status === 'pending'
  ) {
    const cycleNumber = Math.max(1, localSub.current_cycle ?? 1);
    await input.supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_start: nowIso,
        current_period_end: nextBilling,
        next_billing_date: nextBilling,
        updated_at: nowIso,
      })
      .eq('id', input.subscriptionId)
      .in('status', ['past_due', 'paused', 'pending']);

    await ensureSubscriptionCycle(
      input.supabase,
      input.subscriptionId,
      cycleNumber
    );
  }

  return {
    pagarmeSubscriptionId: pagarmeSubscription.id,
    pagarmeCustomerId: input.pagarmeCustomerId,
    startAt,
    nextBillingDate: nextBilling,
    chargedImmediately: true as const,
    amountChargedCents: input.priceCents,
    catchUpOrderId: catchUpOrder.id,
  };
}
