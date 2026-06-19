import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { toAdminCycleDetailView } from '@/lib/admin/cycle-detail-view';
import { getAdminCycleDetail } from '@/lib/admin/queries';

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

    return NextResponse.json(toAdminCycleDetailView(cycle));
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
}
