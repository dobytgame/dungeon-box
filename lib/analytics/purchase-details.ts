import { getPaintKitBump } from '@/lib/checkout/order-bumps';
import {
  parsePaintKitBump,
  parsePaintKitBumpRecurring,
} from '@/lib/checkout/special-notes';
import type { AnalyticsEcommerceItem } from '@/lib/analytics/checkout-items';

export type SubscriptionPurchaseDetail = {
  id: string;
  status: string;
  planSlug: string | null;
  planName: string | null;
  planPriceCents: number | null;
  shippingCents: number | null;
  paintKitBumpId: string | null;
  paintKitRecurring: boolean;
  paidAmountCents: number | null;
};

export function buildPurchaseEcommerceFromSubscriptions(
  subscriptions: SubscriptionPurchaseDetail[]
): { value: number; items: AnalyticsEcommerceItem[] } {
  const items: AnalyticsEcommerceItem[] = [];

  for (const sub of subscriptions) {
    if (sub.planSlug && sub.planPriceCents != null) {
      items.push({
        item_id: sub.planSlug,
        item_name: sub.planName ? `Plano ${sub.planName}` : sub.planSlug,
        price: sub.planPriceCents / 100,
        item_category: 'Assinatura mensal',
        quantity: 1,
      });
    }

    const bumpId = sub.paintKitBumpId;
    if (bumpId) {
      const bump = getPaintKitBump(
        bumpId === 'amador' || bumpId === 'profissional' ? bumpId : null
      );
      if (bump) {
        if (sub.paintKitRecurring) {
          items.push({
            item_id: `paint-kit-${bump.id}-recurring`,
            item_name: `${bump.name} (mensal)`,
            price: bump.priceCents / 100,
            item_category: 'Add-on recorrente',
            quantity: 1,
          });
        } else {
          items.push({
            item_id: `paint-kit-${bump.id}`,
            item_name: bump.name,
            price: bump.priceCents / 100,
            item_category: 'Add-on',
            quantity: 1,
          });
        }
      }
    }

    if ((sub.shippingCents ?? 0) > 0) {
      items.push({
        item_id: `shipping-${sub.id}`,
        item_name: 'Frete mensal',
        price: (sub.shippingCents ?? 0) / 100,
        item_category: 'Frete',
        quantity: 1,
      });
    }
  }

  const paidTotal = subscriptions.reduce(
    (sum, sub) => sum + (sub.paidAmountCents ?? 0),
    0
  );

  if (paidTotal > 0) {
    return { value: paidTotal / 100, items };
  }

  const calculated = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return { value: calculated, items };
}

export function parseSubscriptionPurchaseDetail(input: {
  id: string;
  status: string;
  planSlug: string | null;
  planName: string | null;
  planPriceCents: number | null;
  shippingCents?: number | null;
  specialNotes?: string | null;
  paidAmountCents?: number | null;
}): SubscriptionPurchaseDetail {
  const bumpFromNotes = parsePaintKitBump(input.specialNotes);
  return {
    id: input.id,
    status: input.status,
    planSlug: input.planSlug,
    planName: input.planName,
    planPriceCents: input.planPriceCents,
    shippingCents: input.shippingCents ?? null,
    paintKitBumpId: bumpFromNotes,
    paintKitRecurring: parsePaintKitBumpRecurring(input.specialNotes),
    paidAmountCents: input.paidAmountCents ?? null,
  };
}
