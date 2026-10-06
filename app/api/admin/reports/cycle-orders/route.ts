import { NextResponse } from 'next/server';
import { logAdminAction } from '@/lib/admin/audit';
import { requireAdmin } from '@/lib/admin/auth';
import {
  buildCycleOrdersPrintReport,
  renderCycleOrdersPrintHtml,
} from '@/lib/admin/cycle-orders-print-report';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { user, admin } = await requireAdmin();
    const { searchParams } = new URL(request.url);
    const raw = searchParams.get('ciclo');
    const cycleNumber = raw ? Number.parseInt(raw, 10) : NaN;

    if (!Number.isInteger(cycleNumber) || cycleNumber < 1) {
      return new NextResponse('Informe um ciclo válido (?ciclo=1).', {
        status: 400,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const { rows, cycleLabel } = await buildCycleOrdersPrintReport(
      admin,
      cycleNumber
    );
    const html = renderCycleOrdersPrintHtml({
      cycleLabel,
      rows,
      generatedAt: new Date(),
    });

    const headerList = await headers();
    await logAdminAction(admin, {
      actorId: user.id,
      action: 'production.export_cycle_orders_print',
      entityType: 'subscription_cycle',
      metadata: {
        cycleNumber,
        cycleLabel,
        rowCount: rows.length,
      },
      ipAddress: headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    });

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Não foi possível gerar o relatório.';
    return new NextResponse(message, {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}
