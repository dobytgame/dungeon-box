import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoreProduct } from '@/lib/store/catalog';

export const SUBSCRIBER_STORE_DISCOUNT_PERCENT = 5;
export const SUBSCRIBER_STORE_DISCOUNT_RATE = SUBSCRIBER_STORE_DISCOUNT_PERCENT / 100;
export const SUBSCRIBER_STORE_DISCOUNT_BADGE = `${SUBSCRIBER_STORE_DISCOUNT_PERCENT}% Assinante`;
export const SUBSCRIBER_STORE_DISCOUNT_SUMMARY = `${SUBSCRIBER_STORE_DISCOUNT_PERCENT}% off para assinantes ativos`;

export function formatStorePriceLabel(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function subscriptionStatusEligibleForStoreDiscount(status: string): boolean {
  return status === 'active' || status === 'past_due';
}

export async function userHasActiveStoreSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ['active', 'past_due']);

  if (error) {
    console.error('[store] userHasActiveStoreSubscription:', error.message);
    return false;
  }

  return (count ?? 0) > 0;
}

export function calculateSubscriberStoreDiscountPriceCents(
  basePriceCents: number
): number {
  if (basePriceCents <= 0) return basePriceCents;
  return Math.max(
    1,
    Math.round(basePriceCents * (1 - SUBSCRIBER_STORE_DISCOUNT_RATE))
  );
}

export function applySubscriberDiscountToStoreProduct(
  product: StoreProduct
): StoreProduct {
  const basePriceCents = product.originalPriceCents ?? product.priceCents;
  const discountedPriceCents =
    calculateSubscriberStoreDiscountPriceCents(basePriceCents);

  if (discountedPriceCents >= product.priceCents) {
    return product;
  }

  return {
    ...product,
    originalPriceCents: basePriceCents,
    priceCents: discountedPriceCents,
    priceLabel: formatStorePriceLabel(discountedPriceCents),
    subscriberDiscount: true,
    promoSummary: product.promoSummary ?? SUBSCRIBER_STORE_DISCOUNT_SUMMARY,
  };
}

export async function enrichStoreProductsForSubscriber(
  supabase: SupabaseClient,
  userId: string | null | undefined,
  products: StoreProduct[]
): Promise<StoreProduct[]> {
  if (!userId || products.length === 0) return products;

  const eligible = await userHasActiveStoreSubscription(supabase, userId);
  if (!eligible) return products;

  return products.map(applySubscriberDiscountToStoreProduct);
}

export async function enrichStoreProductForSubscriber(
  supabase: SupabaseClient,
  userId: string | null | undefined,
  product: StoreProduct
): Promise<StoreProduct> {
  const [enriched] = await enrichStoreProductsForSubscriber(supabase, userId, [
    product,
  ]);
  return enriched ?? product;
}
