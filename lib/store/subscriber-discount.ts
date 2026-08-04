import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoreProduct } from '@/lib/store/catalog';

export const SUBSCRIBER_STORE_DISCOUNT_PERCENT = 5;
export const SUBSCRIBER_STORE_DISCOUNT_RATE = SUBSCRIBER_STORE_DISCOUNT_PERCENT / 100;
export const SUBSCRIBER_STORE_DISCOUNT_BADGE = `${SUBSCRIBER_STORE_DISCOUNT_PERCENT}% Assinante`;
export const SUBSCRIBER_STORE_DISCOUNT_SUMMARY = `${SUBSCRIBER_STORE_DISCOUNT_PERCENT}% off para assinantes ativos`;
export const SUBSCRIBER_STORE_PRICE_BADGE = 'Assinante';
export const SUBSCRIBER_STORE_PRICE_SUMMARY = 'Preço de assinante';

export function formatStorePriceLabel(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function resolveSubscriberDiscountPercent(
  product: Pick<StoreProduct, 'subscriberDiscountPercent'>
): number {
  const configured = product.subscriberDiscountPercent;
  if (configured === null || configured === undefined) {
    return SUBSCRIBER_STORE_DISCOUNT_PERCENT;
  }
  return Math.min(100, Math.max(0, configured));
}

export function formatSubscriberDiscountBadge(percent?: number | null): string {
  if (percent == null || percent <= 0) return SUBSCRIBER_STORE_PRICE_BADGE;
  return `${percent}% Assinante`;
}

export function formatSubscriberDiscountSummary(percent?: number | null): string {
  if (percent == null || percent <= 0) return SUBSCRIBER_STORE_PRICE_SUMMARY;
  return `${percent}% off para assinantes ativos`;
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
  basePriceCents: number,
  discountPercent: number = SUBSCRIBER_STORE_DISCOUNT_PERCENT
): number {
  if (basePriceCents <= 0 || discountPercent <= 0) return basePriceCents;
  const rate = discountPercent / 100;
  return Math.max(1, Math.round(basePriceCents * (1 - rate)));
}

function applyFixedSubscriberPriceToStoreProduct(
  product: StoreProduct,
  subscriberPriceCents: number
): StoreProduct {
  const basePriceCents = product.originalPriceCents ?? product.priceCents;
  const discountedPriceCents = Math.max(
    1,
    Math.min(subscriberPriceCents, basePriceCents)
  );

  if (discountedPriceCents >= product.priceCents) {
    return product;
  }

  return {
    ...product,
    originalPriceCents: basePriceCents,
    priceCents: discountedPriceCents,
    priceLabel: formatStorePriceLabel(discountedPriceCents),
    subscriberDiscount: true,
    subscriberDiscountAppliedPercent: undefined,
    promoSummary: product.promoSummary ?? SUBSCRIBER_STORE_PRICE_SUMMARY,
  };
}

export function applySubscriberDiscountToStoreProduct(
  product: StoreProduct
): StoreProduct {
  if (
    product.promoCode &&
    product.originalPriceCents != null &&
    product.originalPriceCents > product.priceCents
  ) {
    return product;
  }

  if (product.subscriberPriceCents != null) {
    return applyFixedSubscriberPriceToStoreProduct(
      product,
      product.subscriberPriceCents
    );
  }

  const discountPercent = resolveSubscriberDiscountPercent(product);
  if (discountPercent <= 0) return product;

  const basePriceCents = product.originalPriceCents ?? product.priceCents;
  const discountedPriceCents = calculateSubscriberStoreDiscountPriceCents(
    basePriceCents,
    discountPercent
  );

  if (discountedPriceCents >= product.priceCents) {
    return product;
  }

  const summary = formatSubscriberDiscountSummary(discountPercent);

  return {
    ...product,
    originalPriceCents: basePriceCents,
    priceCents: discountedPriceCents,
    priceLabel: formatStorePriceLabel(discountedPriceCents),
    subscriberDiscount: true,
    subscriberDiscountAppliedPercent: discountPercent,
    promoSummary: product.promoSummary ?? summary,
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
