import {
  buildPurchaseEcommerceFromSubscriptions,
  parseSubscriptionPurchaseDetail,
  type SubscriptionPurchaseDetail,
} from '@/lib/analytics/purchase-details';

export type MetaPurchasePayload = {
  value: number;
  contentName: string;
  contentIds: string[];
};

export function trackMetaPurchase(input: MetaPurchasePayload): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') {
    return;
  }

  if (input.value <= 0 || !input.contentName.trim() || input.contentIds.length === 0) {
    return;
  }

  window.fbq('track', 'Purchase', {
    value: input.value,
    currency: 'BRL',
    content_name: input.contentName.trim(),
    content_type: 'product',
    content_ids: input.contentIds,
  });
}

export function buildMetaPurchaseFromSubscriptionDetails(
  details: SubscriptionPurchaseDetail[]
): MetaPurchasePayload | null {
  const { value, items } = buildPurchaseEcommerceFromSubscriptions(details);
  if (items.length === 0 || value <= 0) return null;

  const planSlugs = details
    .map((detail) => detail.planSlug)
    .filter((slug): slug is string => Boolean(slug));

  const contentIds =
    planSlugs.length > 0 ? planSlugs : items.map((item) => String(item.item_id));

  const contentName =
    planSlugs.length === 1
      ? planSlugs[0]!
      : planSlugs.length > 1
        ? planSlugs.join(', ')
        : items.map((item) => item.item_name).join(', ');

  return { value, contentName, contentIds };
}

export function buildMetaPurchaseFromSubscriptions(
  subscriptions: Array<{
    id: string;
    status: string;
    planSlug: string | null;
    planName: string | null;
    priceCents: number | null;
    shippingCents?: number | null;
    specialNotes?: string | null;
    paidAmountCents?: number | null;
  }>
): MetaPurchasePayload | null {
  const details = subscriptions.map((row) =>
    parseSubscriptionPurchaseDetail({
      id: row.id,
      status: row.status,
      planSlug: row.planSlug,
      planName: row.planName,
      planPriceCents: row.priceCents,
      shippingCents: row.shippingCents,
      specialNotes: row.specialNotes,
      paidAmountCents: row.paidAmountCents,
    })
  );

  return buildMetaPurchaseFromSubscriptionDetails(details);
}
