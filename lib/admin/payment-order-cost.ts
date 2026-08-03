import type { SupabaseClient } from '@supabase/supabase-js';
import { PAINT_KIT_BUMPS } from '@/lib/checkout/order-bumps';
import { brazilDateToEndIso, brazilDateToStartIso } from '@/lib/datetime/brazil';
import {
  parsePaintKitBump,
  parsePaintKitBumpRecurring,
} from '@/lib/checkout/special-notes';
import { parseStoreOrderMeta } from '@/lib/asaas/store-order-payment';
import { mergeMonthlyKitProductionCosts } from '@/lib/admin/store-products';
import { buildPlanProductionCostMap } from '@/lib/admin/cycle-shipment-finance';
import { isComboPrepaidPayment } from '@/lib/payments/effective-amount';
import { inferPlanSlugFromText } from '@/lib/store/plan-slug-infer';
import {
  isMonthlyKitProductId,
  parseMonthlyKitPlanSlug,
} from '@/lib/store/monthly-kits';

type PaintKitBumpId = 'amador' | 'profissional';

export interface OrderCostCatalog {
  planCostBySlug: Map<string, number>;
  paintKitCostByBumpId: Map<PaintKitBumpId, number>;
  storeProductCostBySlug: Map<string, number>;
}

export interface PaymentOrderCostInput {
  id: string;
  amount_cents: number;
  status_detail: string | null;
  subscription_id: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  installments?: number | null;
  subscriptions: unknown;
}

function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function loadOrderCostCatalog(
  admin: SupabaseClient
): Promise<OrderCostCatalog> {
  const [plansRes, storeProductsRes] = await Promise.all([
    admin.from('plans').select('slug, production_cost_cents'),
    admin.from('store_products').select(
      'slug, production_cost_cents, paint_kit_bump_id, plan_slug, category'
    ),
  ]);

  const planCostBySlug = await mergeMonthlyKitProductionCosts(
    admin,
    buildPlanProductionCostMap(
      (plansRes.data ?? []) as Array<{ slug: string; production_cost_cents: number }>
    )
  );

  const paintKitCostByBumpId = new Map<PaintKitBumpId, number>();
  const storeProductCostBySlug = new Map<string, number>();

  for (const row of storeProductsRes.data ?? []) {
    const cost = (row.production_cost_cents as number) ?? 0;
    const slug = row.slug as string;
    storeProductCostBySlug.set(slug, cost);

    const bumpId = row.paint_kit_bump_id as PaintKitBumpId | null;
    if (bumpId) {
      paintKitCostByBumpId.set(bumpId, cost);
    }
  }

  for (const bump of PAINT_KIT_BUMPS) {
    if (!paintKitCostByBumpId.has(bump.id)) {
      paintKitCostByBumpId.set(bump.id, 0);
    }
  }

  return {
    planCostBySlug,
    paintKitCostByBumpId,
    storeProductCostBySlug,
  };
}

function paintKitCostForBump(
  catalog: OrderCostCatalog,
  bumpId: PaintKitBumpId
): number {
  return catalog.paintKitCostByBumpId.get(bumpId) ?? 0;
}

function planCostForSlug(catalog: OrderCostCatalog, planSlug: string | null): number {
  if (!planSlug) return 0;
  return catalog.planCostBySlug.get(planSlug) ?? 0;
}

function resolveStoreOrderItemCost(
  catalog: OrderCostCatalog,
  line: {
    productId: string;
    quantity: number;
    kind?: string;
    name?: string;
    paintKitBumpId?: 'amador' | 'profissional' | null;
    planSlug?: string | null;
    planName?: string | null;
  }
): number {
  const quantity = line.quantity > 0 ? line.quantity : 1;

  const bumpId =
    line.paintKitBumpId ??
    (line.productId === 'paint-kit-amador'
      ? 'amador'
      : line.productId === 'paint-kit-profissional'
        ? 'profissional'
        : null);
  if (bumpId) {
    return paintKitCostForBump(catalog, bumpId) * quantity;
  }

  const planSlug =
    (typeof line.planSlug === 'string' ? line.planSlug : null) ??
    parseMonthlyKitPlanSlug(line.productId) ??
    inferPlanSlugFromText(
      typeof line.planName === 'string' ? line.planName : line.name ?? null
    );

  if (planSlug || line.kind === 'monthly-kit' || isMonthlyKitProductId(line.productId)) {
    return planCostForSlug(catalog, planSlug) * quantity;
  }

  const slugCandidates = [
    line.productId,
    line.productId.replace(/^paint-kit-/, 'kit-pintura-'),
  ];
  for (const slug of slugCandidates) {
    const cost = catalog.storeProductCostBySlug.get(slug);
    if (cost != null) return cost * quantity;
  }

  return 0;
}

function resolveStoreOrderPaymentCost(
  catalog: OrderCostCatalog,
  statusDetail: string | null
): number {
  const meta = parseStoreOrderMeta(statusDetail);
  if (!meta?.items.length) return 0;

  return meta.items.reduce(
    (sum, line) => sum + resolveStoreOrderItemCost(catalog, line),
    0
  );
}

function resolveStandalonePaintKitCost(
  catalog: OrderCostCatalog,
  amountCents: number
): number {
  const bump = PAINT_KIT_BUMPS.find((entry) => entry.priceCents === amountCents);
  if (!bump) return 0;
  return paintKitCostForBump(catalog, bump.id);
}

function resolveSubscriptionPaymentCost(
  catalog: OrderCostCatalog,
  payment: PaymentOrderCostInput,
  firstPaymentIdBySubscription: ReadonlyMap<string, string>
): number {
  const subscription = relOne(payment.subscriptions) as {
    billing_term?: string | null;
    special_notes?: string | null;
    is_partner?: boolean | null;
    plans?: { slug?: string | null; production_cost_cents?: number | null } | null;
  } | null;

  if (!subscription || !payment.subscription_id) return 0;
  if (subscription.is_partner) return 0;

  const kitOnlyBump = PAINT_KIT_BUMPS.find(
    (entry) => entry.priceCents === payment.amount_cents
  );
  if (kitOnlyBump && !isComboPrepaidPayment(payment.status_detail)) {
    return paintKitCostForBump(catalog, kitOnlyBump.id);
  }

  const plan = relOne(subscription.plans);
  const planSlug = (plan?.slug as string | null) ?? null;
  const boxCost = planSlug
    ? planCostForSlug(catalog, planSlug)
    : ((plan?.production_cost_cents as number | null) ?? 0);

  const isComboPrepaid = isComboPrepaidPayment(payment.status_detail);

  // Combo: custo da caixa entra mês a mês na produção, não no pagamento único.
  if (isComboPrepaid) {
    const paintKitBump = parsePaintKitBump(subscription.special_notes);
    if (
      paintKitBump &&
      !parsePaintKitBumpRecurring(subscription.special_notes)
    ) {
      return paintKitCostForBump(catalog, paintKitBump);
    }
    return 0;
  }

  let cost = boxCost;

  const paintKitBump = parsePaintKitBump(subscription.special_notes);
  if (paintKitBump) {
    const kitCost = paintKitCostForBump(catalog, paintKitBump);
    const recurring = parsePaintKitBumpRecurring(subscription.special_notes);
    if (recurring) {
      cost += kitCost;
    } else if (
      firstPaymentIdBySubscription.get(payment.subscription_id) === payment.id
    ) {
      cost += kitCost;
    }
  }

  return cost;
}

export function resolvePaymentOrderCostCents(
  catalog: OrderCostCatalog,
  payment: PaymentOrderCostInput,
  firstPaymentIdBySubscription: ReadonlyMap<string, string>
): number {
  const storeCost = resolveStoreOrderPaymentCost(catalog, payment.status_detail);
  if (storeCost > 0) return storeCost;

  if (payment.subscription_id) {
    return resolveSubscriptionPaymentCost(
      catalog,
      payment,
      firstPaymentIdBySubscription
    );
  }

  return resolveStandalonePaintKitCost(catalog, payment.amount_cents);
}

export async function loadFirstApprovedPaymentIdBySubscription(
  admin: SupabaseClient,
  subscriptionIds: string[]
): Promise<Map<string, string>> {
  if (subscriptionIds.length === 0) return new Map();

  const { data, error } = await admin
    .from('payments')
    .select('id, subscription_id, paid_at, created_at')
    .in('subscription_id', subscriptionIds)
    .eq('status', 'approved')
    .order('paid_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[admin] loadFirstApprovedPaymentIdBySubscription:', error.message);
    return new Map();
  }

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const subscriptionId = row.subscription_id as string | null;
    if (!subscriptionId || map.has(subscriptionId)) continue;
    map.set(subscriptionId, row.id as string);
  }

  return map;
}

const PAYMENT_ORDER_COST_SELECT = `
  id,
  amount_cents,
  status_detail,
  subscription_id,
  paid_at,
  created_at,
  installments,
  subscriptions(
    billing_term,
    special_notes,
    is_partner,
    plans!plan_id(slug, production_cost_cents)
  )
`;

export async function fetchApprovedPaymentsForOrderCost(
  admin: SupabaseClient,
  from: string,
  to: string
) {
  const { data, error } = await admin
    .from('payments')
    .select(PAYMENT_ORDER_COST_SELECT)
    .eq('status', 'approved')
    .gte('paid_at', brazilDateToStartIso(from))
    .lte('paid_at', brazilDateToEndIso(to));

  if (error) {
    console.error('[admin] fetchApprovedPaymentsForOrderCost:', error.message);
    return [];
  }

  return (data ?? []) as PaymentOrderCostInput[];
}
