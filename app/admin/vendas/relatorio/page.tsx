import Link from 'next/link';
import AdminMonthlyBusinessReport from '@/components/admin/AdminMonthlyBusinessReport';
import AdminSection from '@/components/admin/AdminSection';
import MonthlyBusinessReportPrintButton from '@/components/admin/MonthlyBusinessReportPrintButton';
import { requireAdmin } from '@/lib/admin/auth';
import { buildMonthlyBusinessReport } from '@/lib/admin/monthly-business-report';
import { formatDate } from '@/lib/dashboard/format';

export default async function AdminMonthlyBusinessReportPage() {
  const { admin } = await requireAdmin();
  const report = await buildMonthlyBusinessReport(admin);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-stone-500">
            Vendas · estudo operacional
          </p>
          <h1 className="font-display text-xl uppercase tracking-wide text-white">
            Relatório mensal
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-500">
            Visão mês a mês desde o início da operação ({formatDate(report.from)} →{' '}
            {formatDate(report.to)}): receita, vendas novas (assinatura e loja), renovações,
            novos clientes e base de assinantes.
          </p>
        </div>
        <MonthlyBusinessReportPrintButton />
      </div>

      <AdminSection title="Consolidado por mês">
        <AdminMonthlyBusinessReport report={report} />
      </AdminSection>

      <p className="font-mono text-[11px] text-stone-600">
        <Link href="/admin/vendas" className="text-console hover:underline">
          ← Voltar ao resumo de vendas
        </Link>
      </p>
    </div>
  );
}
