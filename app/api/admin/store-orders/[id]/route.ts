import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getAdminStoreOrderDetail } from '@/lib/admin/store-orders';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { admin } = await requireAdmin();
    const { id: paymentId } = await context.params;
    const order = await getAdminStoreOrderDetail(admin, paymentId);

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
}
