'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Package, Printer } from 'lucide-react';
import type { AdminCycleRow } from '@/lib/admin/types';
import { advanceCycleProductionAction } from '@/lib/admin/actions';
import type { ProductionKanbanBoard } from '@/lib/admin/queries';
import { cloneProductionKanbanBoard } from '@/lib/admin/production-list';
import {
  ProductionKanbanCard,
  type ProductionPendingAction,
} from '@/components/admin/ProductionKanban';
import { getProductionCycleVisual } from '@/lib/admin/production-cycle-theme';
import type { CycleStatus } from '@/lib/dashboard/types';
import { compareCyclesByKitPaymentDate } from '@/lib/subscriptions/cycle-production';

const FLOOR_COLUMNS = ['production', 'preparing', 'packed'] as const;

interface Props {
  board: ProductionKanbanBoard;
  onOpenDetail: (row: AdminCycleRow) => void;
  onOpenShip: (row: AdminCycleRow) => void;
}

function cloneBoard(board: ProductionKanbanBoard): ProductionKanbanBoard {
  return cloneProductionKanbanBoard(board);
}

function moveFloorCard(
  board: ProductionKanbanBoard,
  cycleId: string,
  target: CycleStatus
): ProductionKanbanBoard | null {
  const next = cloneBoard(board);
  let row: AdminCycleRow | null = null;

  for (const status of FLOOR_COLUMNS) {
    const index = next[status].findIndex((item) => item.id === cycleId);
    if (index >= 0) {
      row = next[status][index];
      next[status].splice(index, 1);
      break;
    }
  }

  if (!row) return null;

  const updated: AdminCycleRow = { ...row, status: target };
  if (target === 'production' || target === 'preparing' || target === 'packed') {
    next[target].push(updated);
    next[target].sort(compareCyclesByKitPaymentDate);
  }
  return next;
}

function uniqueCycleNumbers(rows: AdminCycleRow[]): number[] {
  const numbers = new Set<number>();
  for (const row of rows) {
    numbers.add(row.cycle_number >= 1 ? row.cycle_number : 1);
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

function tallyByCycle(rows: AdminCycleRow[]): Array<{ cycleNumber: number; count: number }> {
  const counts = new Map<number, number>();
  for (const row of rows) {
    const n = row.cycle_number >= 1 ? row.cycle_number : 1;
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([cycleNumber, count]) => ({ cycleNumber, count }));
}

export default function ProductionFloorView({
  board,
  onOpenDetail,
  onOpenShip,
}: Props) {
  const router = useRouter();
  const [optimisticBoard, setOptimisticBoard] =
    useState<ProductionKanbanBoard | null>(null);
  const [pendingAction, setPendingAction] =
    useState<ProductionPendingAction | null>(null);
  const [error, setError] = useState('');

  const displayBoard = optimisticBoard ?? board;
  const productionRows = displayBoard.production;
  const preparingRows = displayBoard.preparing;
  const packedRows = displayBoard.packed;
  const legendCycles = useMemo(
    () =>
      uniqueCycleNumbers([...productionRows, ...preparingRows, ...packedRows]),
    [productionRows, preparingRows, packedRows]
  );

  useEffect(() => {
    setOptimisticBoard(null);
  }, [board]);

  function handleAdvance(cycleId: string, target: CycleStatus) {
    setPendingAction({ cycleId, target });
    setError('');

    setOptimisticBoard((current) => {
      const base = current ?? board;
      return moveFloorCard(base, cycleId, target) ?? current;
    });

    void advanceCycleProductionAction(cycleId, target).then((result) => {
      setPendingAction(null);
      if ('error' in result && result.error) {
        setOptimisticBoard(null);
        setError(result.error);
        return;
      }
      if ('emailWarning' in result && result.emailWarning) {
        setError(result.emailWarning);
      }
      router.refresh();
    });
  }

  if (
    productionRows.length === 0 &&
    preparingRows.length === 0 &&
    packedRows.length === 0
  ) {
    return (
      <p className="admin-panel rounded px-4 py-16 text-center font-mono text-xs text-zinc-600">
        Nenhum pedido em produção, preparo ou embalagem.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="admin-panel rounded px-4 py-3 font-mono text-xs text-red-400">
          {error}
        </p>
      ) : null}

      {legendCycles.length > 0 ? (
        <div
          className="flex flex-wrap items-center gap-2"
          aria-label="Legenda de cores por ciclo"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            Ciclos
          </span>
          {legendCycles.map((cycleNumber) => {
            const visual = getProductionCycleVisual(cycleNumber);
            return (
              <span
                key={cycleNumber}
                className={`inline-flex min-h-9 items-center gap-2 rounded border px-2.5 font-mono text-[11px] uppercase tracking-[0.12em] ${visual.badgeClass}`}
              >
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${visual.swatchClass}`}
                  aria-hidden="true"
                />
                {visual.label}
              </span>
            );
          })}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <StageBoard
          title="Quadro de produção"
          hint="Peças sendo impressas — todos os ciclos"
          icon={Printer}
          rows={productionRows}
          emptyLabel="Nada em produção"
          pendingAction={pendingAction}
          onAdvance={handleAdvance}
          onOpenDetail={onOpenDetail}
          onOpenShip={onOpenShip}
          onFeedbackSent={() => router.refresh()}
        />
        <StageBoard
          title="Quadro de preparo"
          hint="Caixas sendo montadas — todos os ciclos"
          icon={Package}
          rows={preparingRows}
          emptyLabel="Nada em preparo"
          pendingAction={pendingAction}
          onAdvance={handleAdvance}
          onOpenDetail={onOpenDetail}
          onOpenShip={onOpenShip}
          onFeedbackSent={() => router.refresh()}
        />
        <StageBoard
          title="Quadro embalado"
          hint="Caixas fechadas, prontas para a fila de coleta"
          icon={Box}
          rows={packedRows}
          emptyLabel="Nada embalado"
          pendingAction={pendingAction}
          onAdvance={handleAdvance}
          onOpenDetail={onOpenDetail}
          onOpenShip={onOpenShip}
          onFeedbackSent={() => router.refresh()}
        />
      </div>
    </div>
  );
}

function StageBoard({
  title,
  hint,
  icon: Icon,
  rows,
  emptyLabel,
  pendingAction,
  onAdvance,
  onOpenDetail,
  onOpenShip,
  onFeedbackSent,
}: {
  title: string;
  hint: string;
  icon: typeof Printer;
  rows: AdminCycleRow[];
  emptyLabel: string;
  pendingAction: ProductionPendingAction | null;
  onAdvance: (cycleId: string, target: CycleStatus) => void;
  onOpenDetail: (row: AdminCycleRow) => void;
  onOpenShip: (row: AdminCycleRow) => void;
  onFeedbackSent: () => void;
}) {
  const tally = tallyByCycle(rows);

  return (
    <section className="flex min-h-[520px] flex-col overflow-hidden rounded border border-zinc-800 bg-zinc-950/50">
      <header className="border-b border-zinc-800 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-zinc-400">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-display text-base uppercase tracking-[0.14em] text-zinc-100">
                {title}
              </h3>
              <p className="mt-1 text-[12px] text-zinc-500">{hint}</p>
            </div>
          </div>
          <span className="rounded bg-zinc-900 px-2.5 py-1 font-mono text-sm tabular-nums text-zinc-200">
            {rows.length}
          </span>
        </div>
        {tally.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tally.map((item) => {
              const visual = getProductionCycleVisual(item.cycleNumber);
              return (
                <span
                  key={item.cycleNumber}
                  className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${visual.badgeClass}`}
                >
                  {visual.label}
                  <span className="tabular-nums opacity-80">{item.count}</span>
                </span>
              );
            })}
          </div>
        ) : null}
      </header>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {rows.length === 0 ? (
          <p className="flex flex-1 items-center justify-center rounded border border-dashed border-zinc-800 px-3 py-16 text-center font-mono text-[11px] text-zinc-600">
            {emptyLabel}
          </p>
        ) : (
          rows.map((row) => (
            <ProductionKanbanCard
              key={row.id}
              row={row}
              colorByCycle
              pendingAction={pendingAction}
              onAdvance={onAdvance}
              onOpenDetail={onOpenDetail}
              onOpenShip={onOpenShip}
              onFeedbackSent={onFeedbackSent}
            />
          ))
        )}
      </div>
    </section>
  );
}
