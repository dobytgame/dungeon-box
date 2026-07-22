'use client';

import { useMemo, useState } from 'react';
import AdminTable from '@/components/admin/AdminTable';
import { MARKETING_AUDIENCE_LABELS } from '@/lib/admin/marketing-audience';
import {
  marketingTemplateLabel,
  type AdminMarketingDispatchRow,
  type AdminMarketingRecipientRow,
  type MarketingRecipientStatus,
} from '@/lib/admin/marketing-dispatch';
import { formatDate } from '@/lib/dashboard/format';

const STATUS_LABELS: Record<MarketingRecipientStatus, string> = {
  sent: 'Enviado',
  failed: 'Falhou',
  skipped: 'Ignorado',
};

const STATUS_FILTERS: Array<MarketingRecipientStatus | 'all'> = [
  'all',
  'sent',
  'failed',
  'skipped',
];

interface Props {
  dispatch: AdminMarketingDispatchRow;
  recipients: AdminMarketingRecipientRow[];
}

export default function AdminMarketingDispatchDetail({
  dispatch,
  recipients,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<MarketingRecipientStatus | 'all'>(
    'all'
  );

  const filteredRecipients = useMemo(() => {
    if (statusFilter === 'all') return recipients;
    return recipients.filter((row) => row.status === statusFilter);
  }, [recipients, statusFilter]);

  return (
    <div className="space-y-6">
      <section className="admin-panel rounded p-5 md:p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          Disparo
        </p>
        <h1 className="mt-2 font-display text-xl uppercase tracking-widest text-stone-100">
          {marketingTemplateLabel(dispatch.templateId)}
        </h1>
        <p className="mt-2 text-sm text-stone-400">{dispatch.subject}</p>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Data
            </dt>
            <dd className="mt-1 text-sm text-stone-200">
              {formatDate(dispatch.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Público
            </dt>
            <dd className="mt-1 text-sm text-stone-200">
              {MARKETING_AUDIENCE_LABELS[dispatch.audience]}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Disparado por
            </dt>
            <dd className="mt-1 text-sm text-stone-200">
              {dispatch.actorName ?? dispatch.actorEmail ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Resumo
            </dt>
            <dd className="mt-1 font-mono text-sm text-stone-200">
              <span className="text-console">{dispatch.sentCount}</span> enviados ·{' '}
              <span className="text-red-300">{dispatch.failedCount}</span> falhas ·{' '}
              <span className="text-stone-400">{dispatch.skippedCount}</span> ignorados
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((filter) => {
            const count =
              filter === 'all'
                ? recipients.length
                : recipients.filter((row) => row.status === filter).length;
            const active = statusFilter === filter;

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`rounded border px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest transition ${
                  active
                    ? 'border-console/40 bg-console/10 text-console'
                    : 'border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
                }`}
              >
                {filter === 'all' ? 'Todos' : STATUS_LABELS[filter]} ({count})
              </button>
            );
          })}
        </div>

        <AdminTable
          rows={filteredRecipients}
          emptyMessage="Nenhum destinatário neste filtro."
          columns={[
            {
              key: 'email',
              header: 'E-mail',
              cell: (row) => (
                <div>
                  <p>{row.email}</p>
                  {row.name ? (
                    <p className="text-xs text-stone-500">{row.name}</p>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              cell: (row) => (
                <span
                  className={
                    row.status === 'sent'
                      ? 'text-console'
                      : row.status === 'failed'
                        ? 'text-red-300'
                        : 'text-stone-400'
                  }
                >
                  {STATUS_LABELS[row.status]}
                </span>
              ),
            },
            {
              key: 'sent_at',
              header: 'Enviado em',
              cell: (row) => formatDate(row.sentAt),
            },
            {
              key: 'error',
              header: 'Detalhe',
              cell: (row) =>
                row.errorMessage ? (
                  <p className="max-w-md text-sm text-stone-400" title={row.errorMessage}>
                    {row.errorMessage}
                  </p>
                ) : row.resendId ? (
                  <span className="font-mono text-[10px] text-stone-500">
                    {row.resendId}
                  </span>
                ) : (
                  '—'
                ),
            },
          ]}
        />
      </section>
    </div>
  );
}
