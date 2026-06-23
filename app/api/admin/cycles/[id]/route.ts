import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { buildCycleShipmentItems, listBundledStoreOrdersBySubscription, listSiblingCyclesForShipment, type CycleShipmentItem } from '@/lib/admin/cycle-shipment-items';
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
    const subscriptionId = subscription?.id;
    let shipmentItems: CycleShipmentItem[] = [];

    if (subscriptionId) {
      const [siblingCycles, storeOrdersBySub] = await Promise.all([
        listSiblingCyclesForShipment(admin, subscriptionId),
        listBundledStoreOrdersBySubscription(admin, [subscriptionId]),
      ]);

      shipmentItems = buildCycleShipmentItems({
        cycle: {
          cycleId: cycle.id,
          cycleNumber: cycle.cycle_number,
          subscriptionId,
          paidAt: cycle.paid_at,
          createdAt: cycle.created_at,
        },
        siblingCycles,
        specialNotes: subscription?.special_notes,
        storeOrders: storeOrdersBySub.get(subscriptionId) ?? [],
      });
    }

    return NextResponse.json(toAdminCycleDetailView(cycle, shipmentItems));
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
}
