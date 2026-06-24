import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { resolveCycleProductionData, type CycleShipmentItem, type ProductionChecklistItem } from '@/lib/admin/cycle-shipment-items';
import { toAdminCycleDetailView } from '@/lib/admin/cycle-detail-view';
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

    if (subscriptionId) {
      const resolved = await resolveCycleProductionData(admin, {
        cycleId: cycle.id,
        cycleNumber: cycle.cycle_number,
        subscriptionId,
        status: cycle.status,
        paidAt: cycle.paid_at,
        createdAt: cycle.created_at,
        specialNotes: subscription?.special_notes,
        planName: plan?.name ?? null,
        themeName: theme?.name ?? null,
        piecesLabel:
          plan?.pieces_min && plan?.pieces_max
            ? `${plan.pieces_min}–${plan.pieces_max} peças`
            : null,
      });
      shipmentItems = resolved.shipmentItems;
      productionChecklist = resolved.productionChecklist;
    }

    return NextResponse.json(
      toAdminCycleDetailView(cycle, shipmentItems, productionChecklist)
    );
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
}
