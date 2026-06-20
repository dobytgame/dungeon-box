import type { PaintKitBumpId } from '@/lib/checkout/order-bumps';
import { hasPaintKitBump } from '@/lib/checkout/special-notes';

export const PAINT_KIT_ADDON_DEFAULT: PaintKitBumpId = 'profissional';

export function paintKitAddonHref(subscriptionId: string): string {
  return `/dashboard/addons/paint-kit?subscription=${subscriptionId}`;
}

export function paintKitAddonAbsoluteUrl(
  subscriptionId: string,
  origin?: string | null
): string {
  const base =
    origin?.replace(/\/$/, '') ??
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    'https://dungeonbox.com.br';
  return `${base}${paintKitAddonHref(subscriptionId)}`;
}

export function subscriptionEligibleForPaintKitAddon(subscription: {
  status: string;
  special_notes?: string | null;
}): boolean {
  const eligibleStatus =
    subscription.status === 'active' || subscription.status === 'past_due';

  return eligibleStatus && !hasPaintKitBump(subscription.special_notes);
}

export function filterPaintKitEligibleSubscriptions<
  T extends { status: string; special_notes?: string | null },
>(subscriptions: T[]): T[] {
  return subscriptions.filter(subscriptionEligibleForPaintKitAddon);
}
