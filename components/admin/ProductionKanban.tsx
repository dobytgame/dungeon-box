'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import type { AdminCycleRow } from '@/lib/admin/types';
import { advanceCycleProductionAction } from '@/lib/admin/actions';
import type { ProductionKanbanBoard } from '@/lib/admin/queries';
import {
  getCycleRollbackTargets,
  PRODUCTION_PIPELINE,
  productionActionLabel,
} from '@/lib/subscriptions/cycle-production';
import type { CycleStatus } from '@/lib/dashboard/types';
import { formatDate } from '@/lib/dashboard/format';
import CycleBundledTags from '@/components/admin/CycleBundledTags';

const KANBAN_COLUMNS = PRODUCTION_PIPELINE.filter(
  (status): status is keyof ProductionKanbanBoard =>
    status === 'upcoming' ||
    status === 'production' ||
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
    hint: 'Pagamento confirmado — fila por ordem de compra',
  },
  production: {
    label: 'Produção',
    hint: 'Peças sendo impressas e preparadas',
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
      target: 'production',
      label: productionActionLabel('upcoming', 'production') ?? 'Iniciar produção',
    };
  }
  if (status === 'production') {
    return {
      target: 'preparing',
      label: productionActionLabel('production', 'preparing') ?? 'Iniciar preparo',
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
  const rollbackTargets = getCycleRollbackTargets(row.status);

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
          <div className="flex shrink-0 items-center gap-1.5">
            {row.isPartner ? (
              <span className="rounded border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-violet-300">
                Parceiro
              </span>
            ) : null}
            <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
              #{row.cycle_number}
            </span>
          </div>
        </div>
        {row.customerEmail ? (
          <p className="truncate font-mono text-[10px] text-zinc-600">
            {row.customerEmail}
          </p>
        ) : null}
        <dl className="grid gap-1 text-[11px] text-zinc-500">
          {row.paid_at ? (
            <div className="flex justify-between gap-2">
              <dt>Compra</dt>
              <dd className="text-zinc-400">{formatDate(row.paid_at)}</dd>
            </div>
          ) : null}
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
        {row.extraItems.length > 0 ? (
          <div className="rounded border border-violet-500/25 bg-violet-500/5 px-2 py-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-violet-300/90">
              + Pedido da loja neste envio
            </p>
            <ul className="mt-1.5 space-y-1">
              {row.extraItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-2 text-[11px] text-zinc-300"
                >
                  <span className="min-w-0 truncate">
                    {item.name}
                    {item.quantity > 1 ? (
                      <span className="ml-1 font-mono text-zinc-500">×{item.quantity}</span>
                    ) : null}
                    {item.paymentPending ? (
                      <span className="ml-1 font-mono text-[9px] uppercase tracking-wider text-amber-400/90">
                        · pag. pendente
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-zinc-500">
                    {item.source === 'store_order' ? 'Loja' : 'Add-on'}
                  </span>
                </li>
              ))}
            </ul>
            <CycleBundledTags tags={row.bundledItemTags} items={[]} compact />
          </div>
        ) : null}
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
        {rollbackTargets.map((rollbackTarget) => {
          const rollbackLabel = productionActionLabel(row.status, rollbackTarget);
          if (!rollbackLabel) return null;

          return (
            <button
              key={rollbackTarget}
              type="button"
              disabled={pending}
              onClick={() => onAdvance(row.id, rollbackTarget)}
              className="inline-flex min-h-[32px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded border border-amber-500/25 bg-amber-500/5 px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-200/90 transition hover:border-amber-500/40 hover:bg-amber-500/10 disabled:opacity-50"
            >
              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              {rollbackLabel}
            </button>
          );
        })}
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

      <div className="grid gap-4 xl:grid-cols-5">
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
