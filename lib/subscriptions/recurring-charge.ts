import type { SupabaseClient } from '@supabase/supabase-js';
import type { PlanSlug } from '@/lib/checkout/plans';
import { getPaintKitBump } from '@/lib/checkout/order-bumps';
import { resolveStoredPromoForRecurringBilling } from '@/lib/checkout/promo-codes';
import {
  parsePaintKitBump,
  parsePaintKitBumpRecurring,
} from '@/lib/checkout/special-notes';

export type SubscriptionRecurringContext = {
  promo_code?: string | null;
  shipping_cents?: number | null;
  special_notes?: string | null;
};

export type PlanChargeRow = {
  slug: string;
  name: string;
  price_cents: number;
};

export type RecurringChargeBreakdown = {
  totalCents: number;
  planCents: number;
  shippingCents: number;
  bumpCents: number;
  promoSummary: string | null;
  description: string;
};

function recurringBumpCents(specialNotes: string | null | undefined): number {
  if (!parsePaintKitBumpRecurring(specialNotes)) return 0;
  const bump = getPaintKitBump(parsePaintKitBump(specialNotes));
  return bump?.priceCents ?? 0;
}

function buildRecurringDescription(
  planName: string,
  specialNotes: string | null | undefined
): string {
  if (!parsePaintKitBumpRecurring(specialNotes)) {
    return `DungeonBox — ${planName}`;
  }

  const bump = getPaintKitBump(parsePaintKitBump(specialNotes));
  if (!bump) {
    return `DungeonBox — ${planName}`;
  }

  return `DungeonBox — ${planName} + ${bump.name}`;
}

export async function resolveSubscriptionRecurringCharge(
  supabase: SupabaseClient,
  plan: PlanChargeRow,
  context: SubscriptionRecurringContext
): Promise<RecurringChargeBreakdown> {
  const baseShipping = context.shipping_cents ?? 0;
  const bumpCents = recurringBumpCents(context.special_notes);

  const promo = await resolveStoredPromoForRecurringBilling(
    supabase,
    context.promo_code,
    plan.slug as PlanSlug,
    plan.price_cents,
    baseShipping
  );

  const planCents = promo?.planCents ?? plan.price_cents;
  const shippingCents = promo?.shippingCents ?? baseShipping;

  return {
    totalCents: planCents + shippingCents + bumpCents,
    planCents,
    shippingCents,
    bumpCents,
    promoSummary: promo?.summary ?? null,
    description: buildRecurringDescription(plan.name, context.special_notes),
  };
}
