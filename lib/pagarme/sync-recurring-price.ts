import type { SupabaseClient } from '@supabase/supabase-js';
import { PAGARME_CONFIGURED, pagarmeRequest } from '@/lib/pagarme/client';
import { userFacingPagarmeError } from '@/lib/pagarme/errors';
import {
  resolveSubscriptionRecurringCharge,
  type PlanChargeRow,
} from '@/lib/subscriptions/recurring-charge';

type PagarmePricingScheme = {
  scheme_type?: string;
  price?: number;
};

type PagarmeSubscriptionItem = {
  id?: string;
  status?: string;
  name?: string | null;
  description?: string | null;
  quantity?: number;
  pricing_scheme?: PagarmePricingScheme | null;
};

type PagarmeSubscriptionDetail = {
  id: string;
  status?: string;
  items?: PagarmeSubscriptionItem[] | null;
};

type PagarmeItemsList = {
  data?: PagarmeSubscriptionItem[];
};

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function itemUnitPriceCents(item: PagarmeSubscriptionItem): number {
  return Math.round(item.pricing_scheme?.price ?? 0);
}

function isActiveItem(item: PagarmeSubscriptionItem): boolean {
  const status = item.status?.trim().toLowerCase();
  return !status || status === 'active';
}

async function listPagarmeSubscriptionItems(
  pagarmeSubscriptionId: string
): Promise<PagarmeSubscriptionItem[]> {
  const remote = await pagarmeRequest<PagarmeSubscriptionDetail>(
    `/subscriptions/${encodeURIComponent(pagarmeSubscriptionId)}`
  );

  if (Array.isArray(remote.items) && remote.items.length > 0) {
    return remote.items;
  }

  const listed = await pagarmeRequest<PagarmeItemsList>(
    `/subscriptions/${encodeURIComponent(pagarmeSubscriptionId)}/items?size=30`
  );

  return listed.data ?? [];
}

function pickPrimaryItem(
  items: PagarmeSubscriptionItem[]
): PagarmeSubscriptionItem | null {
  const active = items.filter((item) => item.id && isActiveItem(item));
  if (active.length === 0) return null;
  if (active.length === 1) return active[0]!;

  // Prefer the highest unit price (main plan line vs tiny add-ons).
  return active.reduce((best, item) =>
    itemUnitPriceCents(item) >= itemUnitPriceCents(best) ? item : best
  );
}

export type SyncPagarmeRecurringPriceResult =
  | {
      status: 'updated';
      expectedCents: number;
      previousCents: number;
      promoSummary: string | null;
      promoCode: string | null;
      itemId: string;
    }
  | {
      status: 'already_aligned';
      expectedCents: number;
      remoteCents: number;
      promoSummary: string | null;
      promoCode: string | null;
    }
  | { status: 'error'; error: string; statusCode?: number };

/**
 * Alinha o preço do item da assinatura no Pagar.me com o valor recorrente local
 * (plano + frete + bump − cupom).
 */
export async function syncPagarmeSubscriptionRecurringPrice(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<SyncPagarmeRecurringPriceResult> {
  if (!PAGARME_CONFIGURED) {
    return { status: 'error', error: 'Pagar.me não configurado.', statusCode: 503 };
  }

  const { data: subscription } = await admin
    .from('subscriptions')
    .select(
      `
      id,
      status,
      promo_code,
      shipping_cents,
      special_notes,
      pagarme_subscription_id,
      plans!plan_id(name, slug, price_cents)
    `
    )
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription) {
    return { status: 'error', error: 'Assinatura não encontrada.', statusCode: 404 };
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

  if (charge.totalCents <= 0) {
    return { status: 'error', error: 'Valor recorrente inválido.', statusCode: 422 };
  }

  try {
    const items = await listPagarmeSubscriptionItems(
      subscription.pagarme_subscription_id
    );
    const item = pickPrimaryItem(items);

    if (!item?.id) {
      return {
        status: 'error',
        error: 'Não foi possível localizar o item da assinatura no Pagar.me.',
        statusCode: 404,
      };
    }

    const remoteCents = itemUnitPriceCents(item);
    const promoCode = subscription.promo_code?.trim() || null;

    if (remoteCents === charge.totalCents) {
      return {
        status: 'already_aligned',
        expectedCents: charge.totalCents,
        remoteCents,
        promoSummary: charge.promoSummary,
        promoCode,
      };
    }

    await pagarmeRequest(
      `/subscriptions/${encodeURIComponent(subscription.pagarme_subscription_id)}/items/${encodeURIComponent(item.id)}`,
      {
        method: 'PUT',
        body: {
          description: charge.description,
          quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
          pricing_scheme: {
            scheme_type: 'unit',
            price: charge.totalCents,
          },
        },
      }
    );

    return {
      status: 'updated',
      expectedCents: charge.totalCents,
      previousCents: remoteCents,
      promoSummary: charge.promoSummary,
      promoCode,
      itemId: item.id,
    };
  } catch (error) {
    console.error('[pagarme] sync recurring price:', subscriptionId, error);
    return {
      status: 'error',
      error: userFacingPagarmeError(error),
      statusCode: 502,
    };
  }
}
