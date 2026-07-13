'use client';

import Link from 'next/link';
import AdminSearchForm from '@/components/admin/AdminSearchForm';
import AdminStarRating from '@/components/admin/AdminStarRating';
import AdminTable from '@/components/admin/AdminTable';
import type { AdminFeedbackRow, AdminFeedbackStats } from '@/lib/admin/types';
import { formatDateTime } from '@/lib/dashboard/format';

interface Props {
  feedbacks: AdminFeedbackRow[];
  stats: AdminFeedbackStats;
  q?: string;
  rating?: string;
}

function truncateMessage(message: string | null, max = 80): string {
  if (!message?.trim()) return '—';
  const trimmed = message.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

export default function AdminFeedbacksClient({
  feedbacks,
  stats,
  q,
  rating,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="admin-panel grid gap-4 rounded p-4 sm:grid-cols-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            Total
          </p>
          <p className="mt-1 font-display text-2xl text-zinc-100">{stats.total}</p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            Média
          </p>
          <p className="mt-1 flex items-center gap-2 font-display text-2xl text-zinc-100">
            {stats.averageRating ?? '—'}
            {stats.averageRating ? (
              <AdminStarRating rating={Math.round(stats.averageRating)} size="md" />
            ) : null}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
            Com fotos
          </p>
          <p className="mt-1 font-display text-2xl text-zinc-100">{stats.withPhotos}</p>
        </div>
      </div>

      <AdminSearchForm
        defaultValue={q ?? ''}
        placeholder="Cliente (nome ou e-mail) ou trecho do comentário"
      >
        <div>
          <label htmlFor="feedback-rating" className="sr-only">
            Nota
          </label>
          <select
            id="feedback-rating"
            name="rating"
            defaultValue={rating ?? ''}
            className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-200"
          >
            <option value="">Todas as notas</option>
            <option value="5">5 estrelas</option>
            <option value="4">4 estrelas</option>
            <option value="3">3 estrelas</option>
            <option value="2">2 estrelas</option>
            <option value="1">1 estrela</option>
          </select>
        </div>
      </AdminSearchForm>

      <AdminTable
        rows={feedbacks}
        getRowHref={(row) => `/admin/feedbacks/${row.id}`}
        emptyMessage="Nenhum feedback recebido ainda."
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
            key: 'cycle',
            header: 'Ciclo',
            cell: (row) =>
              row.cycleNumber
                ? `#${row.cycleNumber}${row.themeName ? ` · ${row.themeEmoji ?? ''} ${row.themeName}` : ''}`
                : '—',
          },
          {
            key: 'rating',
            header: 'Nota',
            cell: (row) => (
              <div className="flex items-center gap-2">
                <AdminStarRating rating={row.rating} />
                <span className="font-mono text-xs text-zinc-500">{row.rating}/5</span>
              </div>
            ),
          },
          {
            key: 'message',
            header: 'Comentário',
            cell: (row) => (
              <span className="text-zinc-400">{truncateMessage(row.message)}</span>
            ),
          },
          {
            key: 'photos',
            header: 'Fotos',
            cell: (row) => (row.imageCount > 0 ? String(row.imageCount) : '—'),
          },
          {
            key: 'links',
            header: '',
            cell: (row) => (
              <div className="flex flex-wrap gap-3 text-xs uppercase tracking-widest">
                <Link
                  href={`/admin/clientes/${row.userId}`}
                  onClick={(event) => event.stopPropagation()}
                  className="text-console hover:underline"
                >
                  Cliente
                </Link>
                <Link
                  href={`/admin/ciclos/${row.cycleId}`}
                  onClick={(event) => event.stopPropagation()}
                  className="text-console hover:underline"
                >
                  Ciclo
                </Link>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
