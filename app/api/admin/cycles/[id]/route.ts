import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { resolveCycleProductionDataWithFinance, listSiblingCyclesForShipment, type CycleShipmentItem, type ProductionChecklistItem } from '@/lib/admin/cycle-shipment-items';
import {
  loadPaymentContextByIds,
  loadSubscriptionPaymentMaps,
  resolveComboPurchaseAnchor,
  resolveComboStartCycleNumber,
  resolveCycleEffectivePaidAt,
} from '@/lib/admin/cycle-payment-resolve';
import { toAdminCycleDetailView, type AdminCyclePendingStoreOrder } from '@/lib/admin/cycle-detail-view';
import type { AdminStoreOrderPurchaseView } from '@/lib/admin/store-order-lines';
import { getAdminCycleDetail } from '@/lib/admin/queries';
import {
  getStandaloneStoreOrderDetail,
  isStandaloneStoreCardId,
} from '@/lib/admin/standalone-store-production';
import { resolveSubscriptionMonthlyRevenueCents } from '@/lib/admin/subscription-monthly-revenue';
import { relOne } from '@/lib/dashboard/format';
import {
  buildCycleKitThemeState,
  loadCycleKitThemeCatalog,
  type CycleKitThemeRef,
} from '@/lib/subscriptions/cycle-kit-theme';
import { formatStoreKitThemeLabel } from '@/lib/store/kit-themes';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { admin } = await requireAdmin();
    const { id: rawId } = await context.params;
    const id = decodeURIComponent(rawId);

    if (isStandaloneStoreCardId(id)) {
      const detail = await getStandaloneStoreOrderDetail(admin, id);
      if (!detail) {
        return NextResponse.json(
          { error: 'Pedido avulso não encontrado.' },
          { status: 404 }
        );
      }
      return NextResponse.json(detail);
    }

    let cycle = await getAdminCycleDetail(admin, id);

    if (!cycle) {
      return NextResponse.json({ error: 'Ciclo não encontrado.' }, { status: 404 });
    }

    const subscription = relOne(cycle.subscriptions);
    const plan = subscription ? relOne(subscription.plans) : null;
    const theme = relOne(cycle.themes);
    const kitThemes = await loadCycleKitThemeCatalog(admin);
    const kitThemeState = buildCycleKitThemeState({
      cycleId: cycle.id,
      cycleNumber: cycle.cycle_number,
      status: cycle.status,
      themes: kitThemes,
      kitThemeId: cycle.kit_theme_id,
      changedFromId: cycle.kit_theme_changed_from_id,
      joinedCurrent: relOne(
        (cycle as { kit_theme?: CycleKitThemeRef | CycleKitThemeRef[] | null }).kit_theme
      ),
      joinedPrevious: relOne(
        (
          cycle as {
            previous_kit_theme?: CycleKitThemeRef | CycleKitThemeRef[] | null;
          }
        ).previous_kit_theme
      ),
    });
    const kitThemeName = kitThemeState
      ? formatStoreKitThemeLabel(kitThemeState.current)
      : null;
    const subscriptionId = subscription?.id;

    if (subscriptionId) {
      const [paymentsById, paymentMaps, siblingCycles] = await Promise.all([
        cycle.payment_id
          ? loadPaymentContextByIds(admin, [cycle.payment_id])
          : Promise.resolve(new Map()),
        loadSubscriptionPaymentMaps(admin, [subscriptionId]),
        listSiblingCyclesForShipment(admin, subscriptionId),
      ]);
      const linkedPayment = cycle.payment_id
        ? paymentsById.get(cycle.payment_id) ?? null
        : null;
      const comboPayment = paymentMaps.comboBySub.get(subscriptionId) ?? null;
      const firstApproved =
        paymentMaps.firstApprovedBySub.get(subscriptionId) ?? null;
      const comboPurchasePaidAt = resolveComboPurchaseAnchor({
        cyclePaidAt: cycle.paid_at,
        linkedPaymentPaidAt: linkedPayment?.paid_at ?? null,
        linkedPaymentCreatedAt: linkedPayment?.created_at ?? null,
        comboPaymentPaidAt: comboPayment?.paid_at ?? null,
        comboPaymentCreatedAt: comboPayment?.created_at ?? null,
        firstApprovedPaymentPaidAt: firstApproved?.paid_at ?? null,
        firstApprovedPaymentCreatedAt: firstApproved?.created_at ?? null,
        subscriptionStartedAt: subscription?.started_at ?? null,
      });
      const comboStartCycleNumber = resolveComboStartCycleNumber({
        billingTerm: subscription?.billing_term ?? null,
        paymentId: cycle.payment_id,
        comboPurchasePaidAt,
        siblings: siblingCycles.map((sibling) => ({
          cycleNumber: sibling.cycleNumber,
          paymentId: sibling.paymentId ?? null,
          paidAt: sibling.paidAt ?? null,
        })),
      });

      cycle = {
        ...cycle,
        paid_at: resolveCycleEffectivePaidAt({
          cycleNumber: cycle.cycle_number,
          cyclePaidAt: cycle.paid_at,
          paymentId: cycle.payment_id,
          billingTerm: subscription?.billing_term ?? null,
          linkedPaymentPaidAt: linkedPayment?.paid_at ?? null,
          linkedPaymentCreatedAt: linkedPayment?.created_at ?? null,
          comboPaymentPaidAt: comboPayment?.paid_at ?? null,
          comboPaymentCreatedAt: comboPayment?.created_at ?? null,
          firstApprovedPaymentPaidAt: firstApproved?.paid_at ?? null,
          firstApprovedPaymentCreatedAt: firstApproved?.created_at ?? null,
          subscriptionStartedAt: subscription?.started_at ?? null,
          comboStartCycleNumber,
        }),
      };
    }

    let shipmentItems: CycleShipmentItem[] = [];
    let productionChecklist: ProductionChecklistItem[] = [];
    let shipmentFinance = null;
    let pendingBundledOrders: AdminCyclePendingStoreOrder[] = [];
    let storeOrderPurchases: AdminStoreOrderPurchaseView[] = [];

    if (subscriptionId) {
      const resolved = await resolveCycleProductionDataWithFinance(admin, {
        cycleId: cycle.id,
        cycleNumber: cycle.cycle_number,
        subscriptionId,
        status: cycle.status,
        paidAt: cycle.paid_at,
        createdAt: cycle.created_at,
        paymentId: cycle.payment_id,
        amountCents: cycle.amount_cents,
        shippingCostCents: cycle.shipping_cost_cents,
        specialNotes: subscription?.special_notes,
        bonusNotes: cycle.bonus_notes,
        planName: plan?.name ?? null,
        planSlug: plan?.slug ?? null,
        planProductionCostCents: plan?.production_cost_cents ?? 0,
        themeName: kitThemeName ?? theme?.name ?? null,
        piecesLabel:
          plan?.pieces_min && plan?.pieces_max
            ? `${plan.pieces_min}–${plan.pieces_max} peças`
            : null,
        isPartner: Boolean(subscription?.is_partner),
        subscriptionBillingTerm: subscription?.billing_term ?? null,
        subscriptionComboTotalCents: subscription?.combo_total_cents ?? null,
        subscriptionComboInstallments: subscription?.combo_installments ?? null,
        fallbackMonthlyRevenueCents: resolveSubscriptionMonthlyRevenueCents({
          planPriceCents: plan?.price_cents ?? null,
          shippingCents: subscription?.shipping_cents ?? null,
          specialNotes: subscription?.special_notes,
        }),
      });
      shipmentItems = resolved.shipmentItems;
      productionChecklist = resolved.productionChecklist;
      shipmentFinance = resolved.finance;
      pendingBundledOrders = resolved.pendingBundledOrders;
      storeOrderPurchases = resolved.storeOrderPurchases;
    }

    return NextResponse.json(
      toAdminCycleDetailView(
        cycle,
        shipmentItems,
        productionChecklist,
        shipmentFinance,
        pendingBundledOrders,
        storeOrderPurchases,
        kitThemes
      )
    );
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
}
