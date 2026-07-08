import type {
  CycleShipmentItem,
  ProductionChecklistItem,
} from '@/lib/admin/cycle-shipment-items';
import type { CycleShipmentFinance } from '@/lib/admin/cycle-shipment-finance';
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
  productionCostCents: number;
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

export interface AdminCyclePendingStoreOrder {
  id: string;
  label: string;
  amountCents: number;
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
  customerCpf: string | null;
  userId: string | null;
  subscriptionId: string | null;
  planName: string | null;
  planSlug: string | null;
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
  productionCostCents: number | null;
  shippingCostCents: number | null;
  kitMarginCents: number | null;
  shipmentFinance: CycleShipmentFinance | null;
  pendingBundledOrders: AdminCyclePendingStoreOrder[];
  isPartner: boolean;
  shipmentItems: CycleShipmentItem[];
  productionChecklist: ProductionChecklistItem[];
  hasBundledItems: boolean;
  isStandaloneStoreOrder?: boolean;
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
  shipmentItems: CycleShipmentItem[] = [],
  productionChecklist: ProductionChecklistItem[] = [],
  shipmentFinance: CycleShipmentFinance | null = null,
  pendingBundledOrders: AdminCyclePendingStoreOrder[] = []
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
              cpf?: string | null;
            }
          | {
              full_name?: string | null;
              display_name?: string | null;
              email?: string | null;
              phone?: string | null;
              cpf?: string | null;
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
        productionCostCents: plan.production_cost_cents ?? 0,
        piecesLabel:
          plan.pieces_min && plan.pieces_max
            ? `${plan.pieces_min}–${plan.pieces_max} peças/mês`
            : null,
      }
    : null;

  const productionCostCents = orderPlan?.productionCostCents ?? null;
  const shippingCostCents = cycle.shipping_cost_cents ?? null;
  const kitMarginCents = shipmentFinance?.marginCents ?? null;

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
    customerCpf: profile?.cpf ?? null,
    userId: subscription?.user_id ?? null,
    subscriptionId: subscription?.id ?? null,
    planName: plan?.name ?? null,
    planSlug: (plan?.slug as string | null) ?? null,
    addressLine,
    orderPlan,
    orderAddons,
    orderAddress,
    orderPromoCode: subscription?.promo_code ?? null,
    orderShippingCents: shippingCents,
    orderShippingRegion: formatShippingRegion(subscription?.shipping_region),
    orderCustomerNotes: parseCustomerNotes(subscription?.special_notes),
    orderMonthlyTotalCents,
    productionCostCents,
    shippingCostCents,
    kitMarginCents,
    shipmentFinance,
    pendingBundledOrders,
    isPartner: Boolean(subscription?.is_partner),
    shipmentItems,
    productionChecklist,
    hasBundledItems: productionChecklist.length > 1 || shipmentItems.length > 0,
    isStandaloneStoreOrder: false,
  };
}

export function toStandaloneStoreOrderDetailView(input: {
  paymentId: string;
  status: SubscriptionCycle['status'];
  amountCents: number;
  paidAt: string | null;
  createdAt: string | null;
  meta: import('@/lib/asaas/store-order-payment').StoreOrderMeta;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  customerCpf: string | null;
  userId: string;
  shipmentItems: CycleShipmentItem[];
  orderAddress: AdminCycleOrderAddress | null;
}): AdminCycleDetailView {
  const { meta } = input;
  const orderLabel =
    meta.items.length > 0
      ? meta.items
          .map((line) =>
            line.quantity > 1 ? `${line.name} ×${line.quantity}` : line.name
          )
          .join(', ')
      : 'Loja avulsa';

  const addressLine = input.orderAddress
    ? input.orderAddress.formattedMultiline.replace(/\n/g, ' · ')
    : null;

  return {
    id: `standalone:${input.paymentId}`,
    cycle_number: 0,
    status: input.status,
    amount_cents: input.amountCents,
    paid_at: input.paidAt ?? input.createdAt,
    tracking_code: meta.trackingCode ?? null,
    carrier: meta.carrier ?? null,
    shipped_at: meta.shippedAt ?? null,
    delivered_at: meta.deliveredAt ?? null,
    cancelled_at: null,
    cancel_reason: null,
    production_notes: meta.productionNotes ?? null,
    estimated_delivery: null,
    themeName: meta.items.find((line) => line.themeName)?.themeName as
      | string
      | undefined ?? null,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    customerCpf: input.customerCpf,
    userId: input.userId,
    subscriptionId: null,
    planName: orderLabel,
    planSlug: null,
    addressLine,
    orderPlan: null,
    orderAddons: [],
    orderAddress: input.orderAddress,
    orderPromoCode: meta.couponCode ?? null,
    orderShippingCents: meta.shippingCents ?? null,
    orderShippingRegion: meta.shippingLabel ?? null,
    orderCustomerNotes: null,
    orderMonthlyTotalCents: null,
    productionCostCents: null,
    shippingCostCents: meta.shippingCostCents ?? null,
    kitMarginCents: null,
    shipmentFinance: null,
    pendingBundledOrders: [],
    isPartner: false,
    shipmentItems: input.shipmentItems,
    productionChecklist: input.shipmentItems.map((item) => ({
      id: item.id,
      kind: item.kind === 'paint-kit' ? 'paint-kit' : item.kind,
      name: item.name,
      tag: item.tag,
      quantity: item.quantity,
      detail: item.detail,
      paymentPending: item.paymentPending,
    })),
    hasBundledItems: input.shipmentItems.length > 0,
    isStandaloneStoreOrder: true,
  };
}
