import type { CycleShipmentItem } from '@/lib/admin/cycle-shipment-items';
import type { Address, SubscriptionCycle } from '@/lib/dashboard/types';
import { getPaintKitBump } from '@/lib/checkout/order-bumps';
import {
  parsePaintKitBump,
  parsePaintKitBumpRecurring,
} from '@/lib/checkout/special-notes';
import { formatZip, relOne } from '@/lib/dashboard/format';
import { regionLabel } from '@/lib/shipping/regions';
import type { ShippingRegion } from '@/lib/shipping/types';

export interface AdminCycleOrderPlan {
  name: string;
  slug: string;
  priceCents: number;
  piecesLabel: string | null;
}

export interface AdminCycleOrderAddon {
  id: string;
  name: string;
  priceLabel: string;
  priceCents: number;
  billing: 'one_time' | 'recurring';
}

export interface AdminCycleOrderAddress {
  recipient: string;
  label: string | null;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  formattedMultiline: string;
}

export interface AdminCycleDetailView {
  id: string;
  cycle_number: number;
  status: SubscriptionCycle['status'];
  amount_cents: number | null;
  paid_at: string | null;
  tracking_code: string | null;
  carrier: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  production_notes: string | null;
  estimated_delivery: string | null;
  themeName: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  userId: string | null;
  subscriptionId: string | null;
  planName: string | null;
  /** @deprecated Use orderAddress */
  addressLine: string | null;
  orderPlan: AdminCycleOrderPlan | null;
  orderAddons: AdminCycleOrderAddon[];
  orderAddress: AdminCycleOrderAddress | null;
  orderPromoCode: string | null;
  orderShippingCents: number | null;
  orderShippingRegion: string | null;
  orderCustomerNotes: string | null;
  orderMonthlyTotalCents: number | null;
  shipmentItems: CycleShipmentItem[];
  hasBundledItems: boolean;
}

const REGION_LABELS: Record<ShippingRegion, string> = {
  sul: 'Sul',
  sudeste: 'Sudeste',
  'centro-oeste': 'Centro-Oeste',
  nordeste: 'Nordeste',
  norte: 'Norte',
};

function formatShippingRegion(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (raw in REGION_LABELS) {
    return regionLabel(raw as ShippingRegion);
  }
  return raw;
}

function parseCustomerNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const lines = notes
    .split('\n')
    .filter((line) => !line.startsWith('paint_kit_bump:'));
  const trimmed = lines.join('\n').trim();
  return trimmed || null;
}

function buildOrderAddress(address: Address): AdminCycleOrderAddress {
  const zipCode = formatZip(address.zip_code);
  const streetLine = `${address.street}, ${address.number}${
    address.complement ? ` — ${address.complement}` : ''
  }`;

  return {
    recipient: address.recipient,
    label: address.label,
    street: address.street,
    number: address.number,
    complement: address.complement,
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state,
    zipCode,
    formattedMultiline: [
      address.recipient,
      address.label ? `(${address.label})` : null,
      streetLine,
      address.neighborhood,
      `${address.city}/${address.state}`,
      `CEP ${zipCode}`,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

function buildOrderAddons(
  specialNotes: string | null | undefined
): AdminCycleOrderAddon[] {
  const bumpId = parsePaintKitBump(specialNotes);
  if (!bumpId) return [];

  const bump = getPaintKitBump(bumpId);
  if (!bump) return [];

  const recurring = parsePaintKitBumpRecurring(specialNotes);

  return [
    {
      id: bump.id,
      name: bump.name,
      priceLabel: bump.priceLabel,
      priceCents: bump.priceCents,
      billing: recurring ? 'recurring' : 'one_time',
    },
  ];
}

export function toAdminCycleDetailView(
  cycle: SubscriptionCycle,
  shipmentItems: CycleShipmentItem[] = []
): AdminCycleDetailView {
  const subscription = relOne(cycle.subscriptions);
  const plan = subscription ? relOne(subscription.plans) : null;
  const address = subscription ? relOne(subscription.addresses) : null;
  const profile = subscription
    ? relOne(
        (subscription as { profiles?: unknown }).profiles as
          | {
              full_name?: string | null;
              display_name?: string | null;
              email?: string | null;
              phone?: string | null;
            }
          | {
              full_name?: string | null;
              display_name?: string | null;
              email?: string | null;
              phone?: string | null;
            }[]
          | null
          | undefined
      )
    : null;
  const theme = relOne(cycle.themes);

  const orderAddress = address ? buildOrderAddress(address) : null;
  const orderAddons = buildOrderAddons(subscription?.special_notes);
  const orderPlan = plan
    ? {
        name: plan.name,
        slug: plan.slug,
        priceCents: plan.price_cents,
        piecesLabel:
          plan.pieces_min && plan.pieces_max
            ? `${plan.pieces_min}–${plan.pieces_max} peças/mês`
            : null,
      }
    : null;

  const shippingCents = subscription?.shipping_cents ?? null;
  const recurringAddonCents = orderAddons
    .filter((addon) => addon.billing === 'recurring')
    .reduce((sum, addon) => sum + addon.priceCents, 0);
  const orderMonthlyTotalCents =
    orderPlan != null
      ? orderPlan.priceCents + (shippingCents ?? 0) + recurringAddonCents
      : null;

  const addressLine = orderAddress
    ? orderAddress.formattedMultiline.replace(/\n/g, ' · ')
    : null;

  return {
    id: cycle.id,
    cycle_number: cycle.cycle_number,
    status: cycle.status,
    amount_cents: cycle.amount_cents,
    paid_at: cycle.paid_at,
    tracking_code: cycle.tracking_code,
    carrier: cycle.carrier,
    shipped_at: cycle.shipped_at,
    delivered_at: cycle.delivered_at,
    cancelled_at: cycle.cancelled_at,
    cancel_reason: cycle.cancel_reason,
    production_notes: cycle.production_notes,
    estimated_delivery: cycle.estimated_delivery,
    themeName: theme?.name ?? null,
    customerName:
      profile?.full_name ?? profile?.display_name ?? profile?.email ?? null,
    customerEmail: profile?.email ?? null,
    customerPhone: profile?.phone ?? null,
    userId: subscription?.user_id ?? null,
    subscriptionId: subscription?.id ?? null,
    planName: plan?.name ?? null,
    addressLine,
    orderPlan,
    orderAddons,
    orderAddress,
    orderPromoCode: subscription?.promo_code ?? null,
    orderShippingCents: shippingCents,
    orderShippingRegion: formatShippingRegion(subscription?.shipping_region),
    orderCustomerNotes: parseCustomerNotes(subscription?.special_notes),
    orderMonthlyTotalCents,
    shipmentItems,
    hasBundledItems: shipmentItems.length > 0,
  };
}
