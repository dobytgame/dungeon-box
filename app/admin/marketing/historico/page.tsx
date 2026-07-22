import Link from 'next/link';
import AdminTable from '@/components/admin/AdminTable';
import { requireAdmin } from '@/lib/admin/auth';
import { MARKETING_AUDIENCE_LABELS } from '@/lib/admin/marketing-audience';
import {
  listMarketingDispatches,
  marketingTemplateLabel,
} from '@/lib/admin/marketing-dispatch';
import { formatDate } from '@/lib/dashboard/format';

export default async function AdminMarketingHistoryPage() {
  const { admin } = await requireAdmin();
  const dispatches = await listMarketingDispatches(admin);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl uppercase tracking-widest text-stone-100">
            Histórico de disparos
          </h1>
          <p className="mt-2 text-sm text-stone-400">
            Registro de quem recebeu, falhou ou foi ignorado em cada campanha.
          </p>
        </div>
        <Link
          href="/admin/marketing"
          className="rounded border border-white/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
        >
          Nova campanha
        </Link>
      </div>

      <AdminTable
        rows={dispatches}
        getRowHref={(row) => `/admin/marketing/historico/${row.id}`}
        emptyMessage="Nenhum disparo registrado ainda."
        columns={[
          {
            key: 'created',
            header: 'Data',
            cell: (row) => formatDate(row.createdAt),
          },
          {
            key: 'template',
            header: 'Campanha',
            cell: (row) => (
              <div>
                <p>{marketingTemplateLabel(row.templateId)}</p>
                <p className="text-xs text-stone-500">{row.subject}</p>
              </div>
            ),
          },
          {
            key: 'audience',
            header: 'Público',
            cell: (row) => MARKETING_AUDIENCE_LABELS[row.audience],
          },
          {
            key: 'sent',
            header: 'Enviados',
            cell: (row) => (
              <span className="font-mono text-console">{row.sentCount}</span>
            ),
          },
          {
            key: 'failed',
            header: 'Falhas',
            cell: (row) => (
              <span
                className={
                  row.failedCount > 0
                    ? 'font-mono text-red-300'
                    : 'font-mono text-stone-500'
                }
              >
                {row.failedCount}
              </span>
            ),
          },
          {
            key: 'skipped',
            header: 'Ignorados',
            cell: (row) => (
              <span className="font-mono text-stone-400">{row.skippedCount}</span>
            ),
          },
          {
            key: 'total',
            header: 'Total',
            cell: (row) => row.totalRecipients,
          },
          {
            key: 'actor',
            header: 'Disparado por',
            cell: (row) => row.actorName ?? row.actorEmail ?? '—',
          },
        ]}
      />
    </div>
  );
}
