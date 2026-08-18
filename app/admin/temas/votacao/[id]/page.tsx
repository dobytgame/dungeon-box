import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdminTable from '@/components/admin/AdminTable';
import KpiCard from '@/components/admin/KpiCard';
import ThemePollForm from '@/components/admin/ThemePollForm';
import { requireAdmin } from '@/lib/admin/auth';
import { formatDate, formatDateTime } from '@/lib/dashboard/format';
import { THEME_POLL_STATUS_LABEL } from '@/lib/theme-votes/labels';
import { getAdminThemePollDetail } from '@/lib/theme-votes/queries';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminThemePollDetailPage({ params }: Props) {
  const { id } = await params;
  const { admin } = await requireAdmin();
  const poll = await getAdminThemePollDetail(admin, id);

  if (!poll) notFound();

  const [first, second] = poll.options;
  const leading =
    poll.winnerOptionId != null
      ? poll.options.find((option) => option.id === poll.winnerOptionId)
      : null;

  return (
    <div className="space-y-8">
      <Link
        href="/admin/temas/votacao"
        className="inline-block text-xs uppercase tracking-widest text-stone-500 hover:text-console"
      >
        ← Voltar para votação
      </Link>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Status"
          value={THEME_POLL_STATUS_LABEL[poll.status]}
          hint={`${formatDate(poll.starts_at)} → ${formatDate(poll.ends_at)}`}
          accent={poll.status === 'open' ? 'console' : 'neutral'}
        />
        <KpiCard
          label="Total de votos"
          value={String(poll.totalVotes)}
          hint="1 voto por assinante ativo"
          accent="gold"
        />
        {first ? (
          <KpiCard
            label={first.name}
            value={String(first.voteCount)}
            hint={poll.totalVotes > 0 ? `${first.percent}% dos votos` : 'Sem votos ainda'}
            accent="console"
          />
        ) : null}
        {second ? (
          <KpiCard
            label={second.name}
            value={String(second.voteCount)}
            hint={poll.totalVotes > 0 ? `${second.percent}% dos votos` : 'Sem votos ainda'}
            accent="neutral"
          />
        ) : null}
      </section>

      {poll.options.length === 2 ? (
        <div className="admin-panel space-y-3 rounded p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Apuração
          </p>
          {poll.options.map((option) => (
            <div key={option.id}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="text-zinc-200">{option.name}</span>
                <span className="font-mono text-xs text-zinc-500">
                  {option.voteCount} · {option.percent}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-zinc-900">
                <div
                  className="h-full bg-console"
                  style={{ width: `${option.percent}%` }}
                />
              </div>
            </div>
          ))}
          <p className="pt-1 text-xs text-zinc-500">
            {poll.totalVotes === 0
              ? 'Nenhum voto registrado ainda.'
              : poll.isTie
                ? 'Empate no momento.'
                : leading
                  ? `Na frente: ${leading.name}.`
                  : null}
          </p>
        </div>
      ) : null}

      <ThemePollForm poll={poll} />

      <div className="space-y-3">
        <h2 className="font-mono text-sm uppercase tracking-[0.16em] text-zinc-400">
          Votos ({poll.voters.length})
        </h2>
        <AdminTable
          rows={poll.voters}
          emptyMessage="Nenhum voto ainda."
          columns={[
            {
              key: 'customer',
              header: 'Assinante',
              cell: (row) => row.customerName || row.customerEmail || row.userId,
            },
            {
              key: 'email',
              header: 'E-mail',
              cell: (row) => row.customerEmail ?? '—',
            },
            {
              key: 'option',
              header: 'Tema',
              cell: (row) => row.optionName,
            },
            {
              key: 'when',
              header: 'Votou em',
              cell: (row) => formatDateTime(row.votedAt),
            },
          ]}
        />
      </div>
    </div>
  );
}
