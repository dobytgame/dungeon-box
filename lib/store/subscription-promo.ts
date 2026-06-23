import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanSlug } from '@/lib/checkout/plans';
import { CHECKOUT_COUPONS_ENABLED } from '@/lib/checkout/public';
import { resolveStoredPromoForStorePrice } from '@/lib/checkout/promo-codes';

export type SubscriptionPromoForStore = {
  promoCode: string;
  summary: string;
  originalPriceCents: number;
  discountedPriceCents: number;
  subscriptionId: string;
};

type SubscriptionPromoSource = {
  id: string;
  promo_code: string | null;
};

export async function resolveBestSubscriptionPromoForStorePlan(
  supabase: SupabaseClient,
  planSlug: PlanSlug,
  originalPriceCents: number,
  subscriptions: SubscriptionPromoSource[]
): Promise<SubscriptionPromoForStore | null> {
  if (!CHECKOUT_COUPONS_ENABLED || originalPriceCents <= 0) {
    return null;
  }

  let best: SubscriptionPromoForStore | null = null;

  for (const subscription of subscriptions) {
    const code = subscription.promo_code?.trim();
    if (!code) continue;

    const resolved = await resolveStoredPromoForStorePrice(
      supabase,
      code,
      planSlug,
      originalPriceCents
    );

    if (!resolved) continue;

    const candidate: SubscriptionPromoForStore = {
      promoCode: resolved.promo.code,
      summary: resolved.summary,
      originalPriceCents,
      discountedPriceCents: resolved.discountedPriceCents,
      subscriptionId: subscription.id,
    };

    if (
      !best ||
      candidate.discountedPriceCents < best.discountedPriceCents
    ) {
      best = candidate;
    }
  }

  return best;
}
