import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { buildMonthlyBusinessReport } from '@/lib/admin/monthly-business-report';
import { renderMonthlyBusinessReportHtml } from '@/lib/admin/monthly-business-report-print';

export async function GET() {
  try {
    const { admin } = await requireAdmin();
    const report = await buildMonthlyBusinessReport(admin);
    const html = renderMonthlyBusinessReportHtml(report);

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
