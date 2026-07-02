import type { BillingTerm } from '@/lib/checkout/combo-billing';
import { isComboTerm, prepaidMonthsForTerm } from '@/lib/checkout/combo-billing';
import { getPaintKitBump, PAINT_KIT_BUMPS } from '@/lib/checkout/order-bumps';
import {
  parsePaintKitBump,
  parsePaintKitBumpRecurring,
} from '@/lib/checkout/special-notes';
import type { CycleShipmentItem } from '@/lib/admin/cycle-shipment-items';
import {
  assignStoreOrderToCycle,
  type CycleShipmentContext,
  type StoreOrderPaymentRow,
} from '@/lib/admin/cycle-shipment-items';
import { parseMonthlyKitPlanSlug } from '@/lib/store/monthly-kits';
import { inferPlanSlugFromText } from '@/lib/store/plan-slug-infer';
import {
  isComboPrepaidPayment,
  parseComboPaymentDetail,
  resolveEffectivePaymentAmountCents,
  type PaymentAmountContext,
  type SubscriptionAmountContext,
} from '@/lib/payments/effective-amount';

export interface CycleFinanceLine {
  id: string;
  label: string;
  amountCents: number;
  pending?: boolean;
}

export interface CycleProductionCostLine {
  id: string;
  label: string;
  amountCents: number;
}

export interface CycleShipmentFinance {
  subscriptionRevenueCents: number;
  bundledRevenueCents: number;
  totalRevenueCents: number;
  subscriptionProductionCostCents: number;
  extraProductionCostCents: number;
  totalProductionCostCents: number;
  shippingCostCents: number | null;
  marginCents: number | null;
  revenueLines: CycleFinanceLine[];
  productionCostLines: CycleProductionCostLine[];
  hasBundledRevenue: boolean;
}

export interface CycleAddonPaymentRow {
  id: string;
  amount_cents: number;
  paid_at: string | null;
  created_at: string | null;
}

const PAINT_KIT_PRICE_CENTS: ReadonlySet<number> = new Set(
  PAINT_KIT_BUMPS.map((bump) => bump.priceCents)
);

function matchedStoreOrdersForCycle(
  cycle: CycleShipmentContext,
  siblingCycles: CycleShipmentContext[],
  storeOrders: StoreOrderPaymentRow[]
): StoreOrderPaymentRow[] {
  return storeOrders.filter((order) => {
    if (order.paymentStatus !== 'approved') return false;
    const assigned = assignStoreOrderToCycle(order, siblingCycles);
    return assigned?.cycleId === cycle.cycleId;
  });
}

function storeOrderItemLabel(
  line: StoreOrderPaymentRow['meta']['items'][number]
): string {
  return line.quantity > 1 ? `${line.name} ×${line.quantity}` : line.name;
}

/** Receita do pedido da loja pelos itens (lineTotalCents), não pelo total do pagamento. */
function buildStoreOrderRevenueLines(
  order: StoreOrderPaymentRow
): { lines: CycleFinanceLine[]; approvedCents: number } {
  const itemLines = order.meta.items
    .map((line, index) => ({
      id: `${order.id}:item:${index}`,
      label: storeOrderItemLabel(line),
      amountCents:
        typeof line.lineTotalCents === 'number' && line.lineTotalCents > 0
          ? line.lineTotalCents
          : 0,
    }))
    .filter((line) => line.amountCents > 0);

  if (itemLines.length > 0) {
    const approvedCents = itemLines.reduce(
      (sum, line) => sum + line.amountCents,
      0
    );
    return { lines: itemLines, approvedCents };
  }

  const fallbackCents = order.amount_cents;
  return {
    lines: [
      {
        id: order.id,
        label: 'Pedido da loja',
        amountCents: fallbackCents,
      },
    ],
    approvedCents: fallbackCents,
  };
}

function addonPaymentTimestamp(row: CycleAddonPaymentRow): number {
  const raw = row.paid_at ?? row.created_at;
  return raw ? Date.parse(raw) : 0;
}

/** Atribui pagamentos avulsos de kit pintura (cobrança única) ao ciclo de envio. */
export function assignAddonPaymentToCycle(
  payment: CycleAddonPaymentRow,
  siblingCycles: CycleShipmentContext[]
): CycleShipmentContext | null {
  const sorted = [...siblingCycles].sort(
    (a, b) => a.cycleNumber - b.cycleNumber
  );
  if (sorted.length === 0) return null;

  const paymentTime = addonPaymentTimestamp(payment);
  if (!paymentTime) {
    return sorted.find((cycle) => cycle.status === 'upcoming') ?? sorted[0] ?? null;
  }

  for (let index = 0; index < sorted.length; index += 1) {
    const cycle = sorted[index];
    const nextCycle = sorted[index + 1];
    if (!nextCycle) return cycle;

    const nextStartRaw = nextCycle.paidAt ?? nextCycle.createdAt;
    const nextStart = nextStartRaw
      ? Date.parse(nextStartRaw)
      : Number.POSITIVE_INFINITY;
    if (paymentTime < nextStart) return cycle;
  }

  return sorted[sorted.length - 1] ?? null;
}

function subscriptionPaintKitOnCycle(
  specialNotes: string | null | undefined,
  cycle: CycleShipmentContext,
  siblingCycles: CycleShipmentContext[]
): { name: string; priceCents: number; recurring: boolean } | null {
  const bumpId = parsePaintKitBump(specialNotes);
  if (!bumpId) return null;

  const recurring = parsePaintKitBumpRecurring(specialNotes);
  if (!recurring) {
    const firstCycle = [...siblingCycles].sort(
      (a, b) => a.cycleNumber - b.cycleNumber
    )[0];
    if (!firstCycle || firstCycle.cycleId !== cycle.cycleId) return null;
  }

  const bump = getPaintKitBump(bumpId);
  if (!bump) return null;

  return {
    name: bump.name,
    priceCents: bump.priceCents,
    recurring,
  };
}

/** Só cobranças avulsas de kit pintura — ignora renovações da assinatura. */
function isPaintKitAddonPayment(
  payment: CycleAddonPaymentRow,
  specialNotes: string | null | undefined,
  cycle: CycleShipmentContext,
  siblingCycles: CycleShipmentContext[],
  cyclePaymentId: string | null,
  cycleAmountCents: number | null,
  storeOrderPaymentIds: ReadonlySet<string>
): boolean {
  if (storeOrderPaymentIds.has(payment.id)) return false;
  if (cyclePaymentId && payment.id === cyclePaymentId) return false;
  if (
    cycleAmountCents != null &&
    cycleAmountCents > 0 &&
    payment.amount_cents === cycleAmountCents
  ) {
    return false;
  }

  if (!PAINT_KIT_PRICE_CENTS.has(payment.amount_cents)) return false;

  const paintKit = subscriptionPaintKitOnCycle(
    specialNotes,
    cycle,
    siblingCycles
  );
  if (!paintKit || paintKit.recurring) return false;

  return payment.amount_cents === paintKit.priceCents;
}

function matchedPaintKitAddonPayments(
  cycle: CycleShipmentContext,
  siblingCycles: CycleShipmentContext[],
  addonPayments: CycleAddonPaymentRow[],
  cyclePaymentId: string | null,
  cycleAmountCents: number | null,
  storeOrderPaymentIds: ReadonlySet<string>,
  specialNotes: string | null | undefined
): CycleAddonPaymentRow[] {
  return addonPayments.filter((payment) => {
    if (
      !isPaintKitAddonPayment(
        payment,
        specialNotes,
        cycle,
        siblingCycles,
        cyclePaymentId,
        cycleAmountCents,
        storeOrderPaymentIds
      )
    ) {
      return false;
    }
    const assigned = assignAddonPaymentToCycle(payment, siblingCycles);
    return assigned?.cycleId === cycle.cycleId;
  });
}

function parseMonthlyKitProductIdFromItemId(itemId: string): string | null {
  const prefix = 'monthly-kit:';
  if (!itemId.startsWith(prefix)) return null;
  const rest = itemId.slice(prefix.length);
  const lastColon = rest.lastIndexOf(':');
  if (lastColon <= 0) return rest;
  return rest.slice(0, lastColon);
}

function resolveMonthlyKitPlanSlug(
  item: CycleShipmentItem,
  planProductionBySlug: ReadonlyMap<string, number>
): string | null {
  if (item.planSlug && planProductionBySlug.has(item.planSlug)) {
    return item.planSlug;
  }

  const productId = parseMonthlyKitProductIdFromItemId(item.id);
  if (productId) {
    const fromProduct = parseMonthlyKitPlanSlug(productId);
    if (fromProduct) return fromProduct;
  }

  const fromName = inferPlanSlugFromText(item.name);
  if (fromName && planProductionBySlug.has(fromName)) {
    return fromName;
  }

  return fromName ?? item.planSlug ?? null;
}

function productionCostForMonthlyKitItem(
  item: CycleShipmentItem,
  planProductionBySlug: ReadonlyMap<string, number>
): number {
  const planSlug = resolveMonthlyKitPlanSlug(item, planProductionBySlug);
  if (!planSlug) return 0;
  return (planProductionBySlug.get(planSlug) ?? 0) * item.quantity;
}

/** Receita da caixa do ciclo (combo pré-pago = total ÷ meses do pacote). */
export function resolveSubscriptionCycleRevenueCents(input: {
  cycleAmountCents: number | null;
  cyclePayment?: PaymentAmountContext | null;
  subscriptionContext?: SubscriptionAmountContext | null;
  /** Plano + frete (+ bump recorrente) quando não há pagamento vinculado. */
  fallbackMonthlyRevenueCents?: number | null;
}): number {
  const payment = input.cyclePayment ?? null;
  const comboDetail = payment
    ? parseComboPaymentDetail(payment.status_detail)
    : null;
  const billingTerm =
    (comboDetail?.billing_term as BillingTerm | null | undefined) ??
    (payment && isComboPrepaidPayment(payment.status_detail)
      ? (input.subscriptionContext?.billing_term as BillingTerm | null | undefined)
      : undefined) ??
    (input.subscriptionContext?.billing_term as BillingTerm | null | undefined) ??
    null;

  const comboFromPayment =
    payment != null && isComboPrepaidPayment(payment.status_detail);

  if ((billingTerm && isComboTerm(billingTerm)) || comboFromPayment) {
    const effectiveTerm =
      billingTerm && isComboTerm(billingTerm)
        ? billingTerm
        : (input.subscriptionContext?.billing_term as BillingTerm | null | undefined);

    const months =
      effectiveTerm && isComboTerm(effectiveTerm)
        ? prepaidMonthsForTerm(effectiveTerm)
        : null;
    if (months && months > 0) {
      let comboTotal =
        input.subscriptionContext?.combo_total_cents ??
        (payment
          ? resolveEffectivePaymentAmountCents(payment, input.subscriptionContext)
          : null);

      if ((comboTotal == null || comboTotal <= 0) && payment && payment.amount_cents > 0) {
        comboTotal = payment.amount_cents;
      }

      if (comboTotal != null && comboTotal > 0) {
        return Math.round(comboTotal / months);
      }
    }
  }

  if (input.cycleAmountCents != null && input.cycleAmountCents > 0) {
    return input.cycleAmountCents;
  }

  if (payment && payment.amount_cents > 0) {
    return payment.amount_cents;
  }

  const monthlyFallback = input.fallbackMonthlyRevenueCents ?? null;
  if (
    monthlyFallback != null &&
    monthlyFallback > 0 &&
    (!billingTerm || billingTerm === 'monthly')
  ) {
    return monthlyFallback;
  }

  return 0;
}

export function resolveCycleShipmentFinance(input: {
  cycleAmountCents: number | null;
  cyclePaymentId: string | null;
  cyclePayment?: PaymentAmountContext | null;
  subscriptionContext?: SubscriptionAmountContext | null;
  shippingCostCents: number | null;
  subscriptionPlanProductionCostCents: number;
  planProductionBySlug: ReadonlyMap<string, number>;
  cycle: CycleShipmentContext;
  siblingCycles: CycleShipmentContext[];
  shipmentItems: CycleShipmentItem[];
  storeOrders: StoreOrderPaymentRow[];
  addonPayments?: CycleAddonPaymentRow[];
  specialNotes?: string | null;
  isPartner?: boolean;
  fallbackMonthlyRevenueCents?: number | null;
}): CycleShipmentFinance {
  const revenueLines: CycleFinanceLine[] = [];
  const productionCostLines: CycleProductionCostLine[] = [];

  const subscriptionRevenueCents = input.isPartner
    ? 0
    : resolveSubscriptionCycleRevenueCents({
        cycleAmountCents: input.cycleAmountCents,
        cyclePayment: input.cyclePayment,
        subscriptionContext: input.subscriptionContext,
        fallbackMonthlyRevenueCents: input.fallbackMonthlyRevenueCents,
      });

  if (subscriptionRevenueCents > 0) {
    const billingTerm = input.subscriptionContext?.billing_term as
      | BillingTerm
      | null
      | undefined;
    const comboCycle =
      (billingTerm && isComboTerm(billingTerm)) ||
      (input.cyclePayment &&
        isComboPrepaidPayment(input.cyclePayment.status_detail));
    revenueLines.push({
      id: 'subscription-cycle',
      label: comboCycle ? 'Assinatura (ciclo combo)' : 'Assinatura (ciclo)',
      amountCents: subscriptionRevenueCents,
    });
  }

  let bundledRevenueCents = 0;

  const matchedStoreOrders = matchedStoreOrdersForCycle(
    input.cycle,
    input.siblingCycles,
    input.storeOrders
  );
  const storeOrderPaymentIds = new Set(
    matchedStoreOrders.map((order) => order.id)
  );

  for (const order of matchedStoreOrders) {
    const { lines, approvedCents } = buildStoreOrderRevenueLines(order);
    bundledRevenueCents += approvedCents;
    revenueLines.push(...lines);
  }

  const paintKit = subscriptionPaintKitOnCycle(
    input.specialNotes,
    input.cycle,
    input.siblingCycles
  );

  for (const payment of matchedPaintKitAddonPayments(
    input.cycle,
    input.siblingCycles,
    input.addonPayments ?? [],
    input.cyclePaymentId,
    input.cycleAmountCents,
    storeOrderPaymentIds,
    input.specialNotes
  )) {
    bundledRevenueCents += payment.amount_cents;
    revenueLines.push({
      id: payment.id,
      label: paintKit?.name ?? 'Kit de pintura (avulso)',
      amountCents: payment.amount_cents,
    });
  }

  const subscriptionProductionCostCents =
    input.subscriptionPlanProductionCostCents;
  if (subscriptionProductionCostCents > 0) {
    productionCostLines.push({
      id: 'subscription-box',
      label: 'Caixa da assinatura',
      amountCents: subscriptionProductionCostCents,
    });
  }

  let extraProductionCostCents = 0;
  for (const item of input.shipmentItems) {
    if (item.kind !== 'monthly-kit') continue;
    const itemCost = productionCostForMonthlyKitItem(
      item,
      input.planProductionBySlug
    );
    if (itemCost <= 0) continue;
    extraProductionCostCents += itemCost;
    productionCostLines.push({
      id: `cost:${item.id}`,
      label: `Produção · ${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ''}`,
      amountCents: itemCost,
    });
  }

  const totalRevenueCents = subscriptionRevenueCents + bundledRevenueCents;
  const totalProductionCostCents =
    subscriptionProductionCostCents + extraProductionCostCents;
  const shippingCost = input.shippingCostCents ?? 0;

  const marginCents = input.isPartner
    ? null
    : totalRevenueCents > 0 || totalProductionCostCents > 0
      ? totalRevenueCents - totalProductionCostCents - shippingCost
      : null;

  return {
    subscriptionRevenueCents,
    bundledRevenueCents,
    totalRevenueCents,
    subscriptionProductionCostCents,
    extraProductionCostCents,
    totalProductionCostCents,
    shippingCostCents: input.shippingCostCents,
    marginCents,
    revenueLines,
    productionCostLines,
    hasBundledRevenue: bundledRevenueCents > 0,
  };
}

export function buildPlanProductionCostMap(
  plans: Array<{ slug: string; production_cost_cents: number }>
): Map<string, number> {
  return new Map(
    plans.map((plan) => [plan.slug, plan.production_cost_cents ?? 0])
  );
}
