import { pushDataLayer, trackBeginCheckout } from '@/lib/analytics/data-layer';
import type { PlanSlug } from '@/lib/checkout/plans';
import { plans } from '@/lib/data';

export const GUILD_LP_PAGE_VARIANT = 'purchase_path_v1';

function track(event: string, properties: Record<string, unknown> = {}) {
  pushDataLayer({
    event,
    page_path: '/entre-para-guilda',
    page_variant: GUILD_LP_PAGE_VARIANT,
    ...properties,
  });
}

export function trackGuildCheckoutClick(plan: PlanSlug, position: string) {
  track('checkout_click', {
    plan_id: plan,
    cta_position: position,
  });

  const entry = plans.find((item) => item.id === plan);
  if (!entry) return;

  trackBeginCheckout({
    planSlug: entry.id,
    planName: `Plano ${entry.name}`,
    value: entry.price,
    location: `guild_${position}`,
  });
}

export function trackGuildShippingQuoteSuccess(plan: PlanSlug) {
  track('shipping_quote_success', {
    plan_id: plan,
  });
}

export function trackGuildSupportClick(position: string, plan?: string) {
  track('whatsapp_support_click', {
    cta_position: position,
    ...(plan ? { plan_id: plan } : {}),
    contact_destination: 'support',
  });
}

export function trackGuildInviteClick(position: string) {
  track('guild_invite_click', {
    cta_position: position,
    contact_destination: 'guild',
  });
}
