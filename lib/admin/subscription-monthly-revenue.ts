import { getPaintKitBump } from '@/lib/checkout/order-bumps';
import {
  parsePaintKitBump,
  parsePaintKitBumpRecurring,
} from '@/lib/checkout/special-notes';

/** Mensalidade estimada (plano + frete + bump recorrente) para receita quando o pagamento não está vinculado ao ciclo. */
export function resolveSubscriptionMonthlyRevenueCents(input: {
  planPriceCents: number | null | undefined;
  shippingCents: number | null | undefined;
  specialNotes?: string | null;
}): number | null {
  if (input.planPriceCents == null || input.planPriceCents <= 0) {
    return null;
  }

  let recurringAddonCents = 0;
  const bumpId = parsePaintKitBump(input.specialNotes);
  if (bumpId && parsePaintKitBumpRecurring(input.specialNotes)) {
    const bump = getPaintKitBump(bumpId);
    if (bump) recurringAddonCents = bump.priceCents;
  }

  return input.planPriceCents + (input.shippingCents ?? 0) + recurringAddonCents;
}
