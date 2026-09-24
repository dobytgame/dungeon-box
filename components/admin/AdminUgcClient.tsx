'use client';

import { useState } from 'react';
import Link from 'next/link';
import AdminSearchForm from '@/components/admin/AdminSearchForm';
import AdminTable from '@/components/admin/AdminTable';
import {
  ugcKanbanColumn,
  type AdminUgcKanbanColumn,
  type AdminUgcRow,
  type AdminUgcStats,
} from '@/lib/admin/ugc';
import { optionLabel, UGC_RPG_SYSTEMS } from '@/lib/ugc/options';
import { formatInstagramHandle } from '@/lib/ugc/instagram';
import { formatDateTime } from '@/lib/dashboard/format';

interface Props {
  rows: AdminUgcRow[];
  queryError?: string | null;
  stats: AdminUgcStats;
  q?: string;
  status?: string;
}

const STATUS_LABEL: Record<AdminUgcRow['contentStatus'], string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Recusado',
};

const COLUMN_META: { id: AdminUgcKanbanColumn; title: string }[] = [
  { id: 'pending', title: 'Pendente' },
  { id: 'approved', title: 'Aprovado' },
  { id: 'sent', title: 'Brinde enviado' },
  { id: 'rejected', title: 'Recusado' },
];

function truncate(text: string, max = 80): string {
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

export default function AdminUgcClient({
  rows,
  queryError,
  stats,
  q,
  status,
}: Props) {
  const [view, setView] = useState<'kanban' | 'list'>('kanban');

  return (
    <div className="space-y-6">
      {queryError ? (
        <div
          className="rounded border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          Não foi possível carregar os envios: {queryError}
        </div>
      ) : null}

      <div className="admin-panel grid gap-4 rounded p-4 sm:grid-cols-5">
        {[
          ['Total', stats.total],
          ['Pendentes', stats.pending],
          ['Aprovados', stats.approved],
          ['Brinde enviado', stats.sent],
          ['Recusados', stats.rejected],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
              {label}
            </p>
            <p className="mt-1 font-display text-2xl text-zinc-100">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminSearchForm
          defaultValue={q ?? ''}
          placeholder="Cliente, e-mail, Instagram ou trecho da cena"
        >
          <div>
            <label htmlFor="ugc-status" className="sr-only">
              Status
            </label>
            <select
              id="ugc-status"
              name="status"
              defaultValue={status ?? ''}
              className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-200"
            >
              <option value="">Todos os status</option>
              <option value="pending">Pendentes</option>
              <option value="approved">Aprovados</option>
              <option value="rejected">Recusados</option>
            </select>
          </div>
        </AdminSearchForm>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView('kanban')}
            className={`rounded border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] ${
              view === 'kanban'
                ? 'border-console/40 bg-console/10 text-console'
                : 'border-zinc-800 text-zinc-500'
            }`}
          >
            Kanban
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={`rounded border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] ${
              view === 'list'
                ? 'border-console/40 bg-console/10 text-console'
                : 'border-zinc-800 text-zinc-500'
            }`}
          >
            Lista
          </button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="grid gap-4 xl:grid-cols-4">
          {COLUMN_META.map((column) => {
            const cards = rows.filter((row) => ugcKanbanColumn(row) === column.id);
            return (
              <section key={column.id} className="admin-panel rounded p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                  {column.title} · {cards.length}
                </p>
                <ul className="mt-3 space-y-2">
                  {cards.map((row) => (
                    <li key={row.id}>
                      <Link
                        href={`/admin/ugc/${row.id}`}
                        className="block rounded border border-zinc-800 bg-zinc-950/80 p-3 hover:border-console/40"
                      >
                        <p className="text-sm text-zinc-100">
                          {row.customerName ?? row.customerEmail ?? '—'}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
                          {truncate(row.context, 90)}
                        </p>
                        <p className="mt-2 font-mono text-[10px] text-zinc-600">
                          {row.mediaCount} arquivo{row.mediaCount === 1 ? '' : 's'}
                          {row.rpgSystem
                            ? ` · ${optionLabel(UGC_RPG_SYSTEMS, row.rpgSystem)}`
                            : ''}
                        </p>
                      </Link>
                    </li>
                  ))}
                  {cards.length === 0 ? (
                    <li className="px-1 py-6 text-center font-mono text-[10px] text-zinc-600">
                      Vazio
                    </li>
                  ) : null}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <AdminTable
          rows={rows}
          getRowHref={(row) => `/admin/ugc/${row.id}`}
          emptyMessage="Nenhum envio da campanha ainda."
          columns={[
            {
              key: 'when',
              header: 'Quando',
              cell: (row) => formatDateTime(row.createdAt),
            },
            {
              key: 'customer',
              header: 'Cliente',
              cell: (row) => (
                <div>
                  <p>{row.customerName ?? '—'}</p>
                  <p className="text-xs text-zinc-500">{row.customerEmail ?? '—'}</p>
                </div>
              ),
            },
            {
              key: 'instagram',
              header: 'Instagram',
              cell: (row) => formatInstagramHandle(row.instagram) ?? '—',
            },
            {
              key: 'system',
              header: 'Sistema',
              cell: (row) => optionLabel(UGC_RPG_SYSTEMS, row.rpgSystem) ?? '—',
            },
            {
              key: 'context',
              header: 'Cena',
              cell: (row) => (
                <span className="text-zinc-400">{truncate(row.context)}</span>
              ),
            },
            {
              key: 'files',
              header: 'Arquivos',
              cell: (row) => row.mediaCount,
            },
            {
              key: 'status',
              header: 'Status',
              cell: (row) =>
                row.rewardStatus === 'sent'
                  ? 'Brinde enviado'
                  : STATUS_LABEL[row.contentStatus],
            },
          ]}
        />
      )}
    </div>
  );
}
