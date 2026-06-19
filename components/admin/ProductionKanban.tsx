'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import type { AdminCycleRow } from '@/lib/admin/types';
import { advanceCycleProductionAction } from '@/lib/admin/actions';
import type { ProductionKanbanBoard } from '@/lib/admin/queries';
import {
  PRODUCTION_PIPELINE,
  productionActionLabel,
} from '@/lib/subscriptions/cycle-production';
import type { CycleStatus } from '@/lib/dashboard/types';

const KANBAN_COLUMNS = PRODUCTION_PIPELINE.filter(
  (status): status is keyof ProductionKanbanBoard =>
    status === 'upcoming' ||
    status === 'preparing' ||
    status === 'shipped' ||
    status === 'delivered'
);

const COLUMN_META: Record<
  keyof ProductionKanbanBoard,
  { label: string; hint: string }
> = {
  upcoming: {
    label: 'Aguardando',
    hint: 'Pagamento confirmado, aguardando montagem',
  },
  preparing: {
    label: 'Em preparo',
    hint: 'Caixa sendo montada no estoque',
  },
  shipped: {
    label: 'Enviado',
    hint: 'Em trânsito com rastreio',
  },
  delivered: {
    label: 'Entregue',
    hint: 'Entrega confirmada',
  },
};

interface Props {
  board: ProductionKanbanBoard;
  counts: {
    cancelled: number;
    failed: number;
  };
  onOpenDetail: (row: AdminCycleRow) => void;
  onOpenShip: (row: AdminCycleRow) => void;
}

function nextQuickAction(
  status: CycleStatus
): { target: CycleStatus; label: string } | null {
  if (status === 'upcoming') {
    return {
      target: 'preparing',
      label: productionActionLabel('upcoming', 'preparing') ?? 'Iniciar preparo',
    };
  }
  if (status === 'shipped') {
    return {
      target: 'delivered',
      label: productionActionLabel('shipped', 'delivered') ?? 'Marcar entregue',
    };
  }
  return null;
}

function KanbanCard({
  row,
  onAdvance,
  onOpenDetail,
  onOpenShip,
  pending,
}: {
  row: AdminCycleRow;
  onAdvance: (cycleId: string, target: CycleStatus) => void;
  onOpenDetail: (row: AdminCycleRow) => void;
  onOpenShip: (row: AdminCycleRow) => void;
  pending: boolean;
}) {
  const quick = nextQuickAction(row.status);

  return (
    <article className="admin-panel rounded border border-zinc-800/80 bg-zinc-950/60 p-3 transition hover:border-zinc-700">
      <button
        type="button"
        onClick={() => onOpenDetail(row)}
        className="block w-full space-y-2 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-zinc-200">
            {row.customerName ?? 'Cliente sem nome'}
          </p>
          <span className="shrink-0 rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
            #{row.cycle_number}
          </span>
        </div>
        {row.customerEmail ? (
          <p className="truncate font-mono text-[10px] text-zinc-600">
            {row.customerEmail}
          </p>
        ) : null}
        <dl className="grid gap-1 text-[11px] text-zinc-500">
          {row.planName ? (
            <div className="flex justify-between gap-2">
              <dt>Plano</dt>
              <dd className="text-zinc-400">{row.planName}</dd>
            </div>
          ) : null}
          {row.themeName ? (
            <div className="flex justify-between gap-2">
              <dt>Tema</dt>
              <dd className="truncate text-zinc-400">{row.themeName}</dd>
            </div>
          ) : null}
          {row.city && row.state ? (
            <div className="flex justify-between gap-2">
              <dt>Destino</dt>
              <dd className="text-zinc-400">
                {row.city}/{row.state}
              </dd>
            </div>
          ) : null}
          {row.tracking_code ? (
            <div className="flex justify-between gap-2">
              <dt>Rastreio</dt>
              <dd className="truncate font-mono text-console">{row.tracking_code}</dd>
            </div>
          ) : null}
        </dl>
      </button>

      <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-800/80 pt-3">
        {row.status === 'preparing' ? (
          <button
            type="button"
            onClick={() => onOpenShip(row)}
            className="inline-flex min-h-[32px] flex-1 cursor-pointer items-center justify-center rounded border border-console/30 bg-console/10 px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-console transition hover:bg-console/20"
          >
            Registrar envio
          </button>
        ) : quick ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => onAdvance(row.id, quick.target)}
            className="inline-flex min-h-[32px] flex-1 items-center justify-center gap-1.5 rounded border border-zinc-700 px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-300 transition hover:border-console/40 hover:text-console disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {quick.label}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onOpenDetail(row)}
          className="inline-flex min-h-[32px] cursor-pointer items-center justify-center rounded border border-zinc-800 px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300"
        >
          Detalhes
        </button>
      </div>
    </article>
  );
}

export default function ProductionKanban({
  board,
  counts,
  onOpenDetail,
  onOpenShip,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState('');

  function handleAdvance(cycleId: string, target: CycleStatus) {
    setActiveId(cycleId);
    setError('');
    startTransition(async () => {
      const result = await advanceCycleProductionAction(cycleId, target);
      setActiveId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="admin-panel rounded px-4 py-3 font-mono text-xs text-red-400">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-4">
        {KANBAN_COLUMNS.map((status) => {
          const meta = COLUMN_META[status];
          const cards = board[status];

          return (
            <section
              key={status}
              className="flex min-h-[420px] flex-col rounded border border-zinc-800/80 bg-zinc-950/40"
            >
              <header className="border-b border-zinc-800/80 px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-300">
                    {meta.label}
                  </h3>
                  <span className="rounded bg-zinc-900 px-2 py-0.5 font-mono text-[10px] tabular-nums text-zinc-500">
                    {cards.length}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-600">{meta.hint}</p>
              </header>

              <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
                {cards.length === 0 ? (
                  <p className="rounded border border-dashed border-zinc-800 px-3 py-8 text-center font-mono text-[10px] text-zinc-600">
                    Nenhum pedido
                  </p>
                ) : (
                  cards.map((row) => (
                    <KanbanCard
                      key={row.id}
                      row={row}
                      pending={pending && activeId === row.id}
                      onAdvance={handleAdvance}
                      onOpenDetail={onOpenDetail}
                      onOpenShip={onOpenShip}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {(counts.cancelled > 0 || counts.failed > 0) && (
        <p className="font-mono text-[11px] text-zinc-600">
          Fora do quadro:{' '}
          {counts.cancelled > 0 ? (
            <Link
              href="/admin/ciclos?status=cancelled"
              className="text-zinc-400 hover:text-console"
            >
              {counts.cancelled} cancelado(s)
            </Link>
          ) : null}
          {counts.cancelled > 0 && counts.failed > 0 ? ' · ' : null}
          {counts.failed > 0 ? (
            <Link
              href="/admin/ciclos?status=failed"
              className="text-zinc-400 hover:text-console"
            >
              {counts.failed} falha(s) de pagamento
            </Link>
          ) : null}
        </p>
      )}
    </div>
  );
}
