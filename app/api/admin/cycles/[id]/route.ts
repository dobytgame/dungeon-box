import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { resolveCycleProductionDataWithFinance, type CycleShipmentItem, type ProductionChecklistItem } from '@/lib/admin/cycle-shipment-items';
import { toAdminCycleDetailView, type AdminCyclePendingStoreOrder } from '@/lib/admin/cycle-detail-view';
import { getAdminCycleDetail } from '@/lib/admin/queries';
import { relOne } from '@/lib/dashboard/format';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { admin } = await requireAdmin();
    const { id } = await context.params;
    const cycle = await getAdminCycleDetail(admin, id);

    if (!cycle) {
      return NextResponse.json({ error: 'Ciclo não encontrado.' }, { status: 404 });
    }

    const subscription = relOne(cycle.subscriptions);
    const plan = subscription ? relOne(subscription.plans) : null;
    const theme = relOne(cycle.themes);
    const subscriptionId = subscription?.id;

    let shipmentItems: CycleShipmentItem[] = [];
    let productionChecklist: ProductionChecklistItem[] = [];
    let shipmentFinance = null;
    let pendingBundledOrders: AdminCyclePendingStoreOrder[] = [];

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
        planName: plan?.name ?? null,
        planSlug: plan?.slug ?? null,
        planProductionCostCents: plan?.production_cost_cents ?? 0,
        themeName: theme?.name ?? null,
        piecesLabel:
          plan?.pieces_min && plan?.pieces_max
            ? `${plan.pieces_min}–${plan.pieces_max} peças`
            : null,
        isPartner: Boolean(subscription?.is_partner),
        subscriptionBillingTerm: subscription?.billing_term ?? null,
        subscriptionComboTotalCents: subscription?.combo_total_cents ?? null,
        subscriptionComboInstallments: subscription?.combo_installments ?? null,
      });
      shipmentItems = resolved.shipmentItems;
      productionChecklist = resolved.productionChecklist;
      shipmentFinance = resolved.finance;
      pendingBundledOrders = resolved.pendingBundledOrders;
    }

    return NextResponse.json(
      toAdminCycleDetailView(
        cycle,
        shipmentItems,
        productionChecklist,
        shipmentFinance,
        pendingBundledOrders
      )
    );
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
}
