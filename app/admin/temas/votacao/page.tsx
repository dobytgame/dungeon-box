import Link from 'next/link';
import AdminTable from '@/components/admin/AdminTable';
import { requireAdmin } from '@/lib/admin/auth';
import { formatDate } from '@/lib/dashboard/format';
import { THEME_POLL_STATUS_LABEL } from '@/lib/theme-votes/labels';
import { listThemePollsWithTallies } from '@/lib/theme-votes/queries';

export default async function AdminThemePollsPage() {
  const { admin } = await requireAdmin();
  const polls = await listThemePollsWithTallies(admin);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href="/admin/temas/votacao/novo"
          className="rounded-sm bg-console px-4 py-2.5 font-display text-xs uppercase tracking-widest text-stone-950"
        >
          Nova votação
        </Link>
      </div>

      <AdminTable
        rows={polls.map((poll) => ({ ...poll, id: poll.id }))}
        getRowHref={(row) => `/admin/temas/votacao/${row.id}`}
        emptyMessage="Nenhuma votação cadastrada. Crie a do ciclo 3 para abrir aos assinantes."
        columns={[
          {
            key: 'cycle',
            header: 'Ciclo',
            cell: (row) => `#${row.cycle_number}`,
          },
          {
            key: 'themes',
            header: 'Temas',
            cell: (row) =>
              row.options.map((option) => option.name).join(' vs ') || '—',
          },
          {
            key: 'window',
            header: 'Período',
            cell: (row) =>
              `${formatDate(row.starts_at)} → ${formatDate(row.ends_at)}`,
          },
          {
            key: 'status',
            header: 'Status',
            cell: (row) => THEME_POLL_STATUS_LABEL[row.status],
          },
          {
            key: 'votes',
            header: 'Votos',
            cell: (row) => {
              const [first, second] = row.options;
              if (!first || !second) return String(row.totalVotes);
              return `${row.totalVotes} · ${first.voteCount} / ${second.voteCount}`;
            },
          },
        ]}
      />
    </div>
  );
}
