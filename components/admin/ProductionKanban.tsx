'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { AdminCycleRow } from '@/lib/admin/types';
import { advanceCycleProductionAction } from '@/lib/admin/actions';
import type { ProductionKanbanBoard } from '@/lib/admin/queries';
import {
  compareCyclesByKitPaymentDate,
  getCycleRollbackTargets,
  PRODUCTION_PIPELINE,
  productionActionLabel,
} from '@/lib/subscriptions/cycle-production';
import type { CycleStatus } from '@/lib/dashboard/types';
import { formatDate, formatDateTime, formatMoney } from '@/lib/dashboard/format';
import ComboBadge from '@/components/admin/ComboBadge';
import CycleBundledTags from '@/components/admin/CycleBundledTags';
import CycleProductionNotesHighlight from '@/components/admin/CycleProductionNotesHighlight';
import AdminPlanChip from '@/components/admin/AdminPlanChip';
import ProductionMonthBadge from '@/components/admin/ProductionMonthBadge';
import { resolveProductionMonthKey } from '@/lib/admin/production-month';
import type { BillingTerm } from '@/lib/checkout/combo-billing';
import { isComboTerm } from '@/lib/checkout/combo-billing';
import { adminPlanCardClasses } from '@/lib/plan-theme';
import {
  getProductionCycleVisual,
  productionCycleCardClasses,
} from '@/lib/admin/production-cycle-theme';
import { kanbanCyclePaidAt } from '@/lib/admin/cycle-payment-resolve';
import SendFeedbackEmailButton from '@/components/admin/SendFeedbackEmailButton';
import ProductionSlaStrip from '@/components/admin/ProductionSlaStrip';

export type ProductionBoardColumn = keyof ProductionKanbanBoard;

export type ProductionPendingAction = {
  cycleId: string;
  target: CycleStatus;
};

const KANBAN_COLUMNS = PRODUCTION_PIPELINE.filter(
  (status): status is ProductionBoardColumn =>
    status === 'upcoming' ||
    status === 'production' ||
    status === 'preparing' ||
    status === 'shipped' ||
    status === 'delivered'
);

function cloneBoard(board: ProductionKanbanBoard): ProductionKanbanBoard {
  return {
    upcoming: [...board.upcoming],
    production: [...board.production],
    preparing: [...board.preparing],
    shipped: [...board.shipped],
    delivered: [...board.delivered],
  };
}

function moveCardInBoard(
  board: ProductionKanbanBoard,
  cycleId: string,
  target: CycleStatus,
  visibleColumns: ProductionBoardColumn[]
): ProductionKanbanBoard | null {
  const next = cloneBoard(board);
  let row: AdminCycleRow | null = null;

  for (const status of visibleColumns) {
    const index = next[status].findIndex((item) => item.id === cycleId);
    if (index >= 0) {
      row = next[status][index];
      next[status].splice(index, 1);
      break;
    }
  }

  if (!row) return null;

  const updated: AdminCycleRow = { ...row, status: target };
  if (visibleColumns.includes(target as ProductionBoardColumn)) {
    const column = target as ProductionBoardColumn;
    next[column].push(updated);
    next[column].sort(compareCyclesByKitPaymentDate);
  }
  return next;
}

const COLUMN_META: Record<
  ProductionBoardColumn,
  { label: string; hint: string }
> = {
  upcoming: {
    label: 'Aguardando',
    hint: 'Fila por criação da assinatura, depois pagamento do ciclo',
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
  columns?: ProductionBoardColumn[];
  groupByCycle?: boolean;
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

export function ProductionKanbanCard({
  row,
  onAdvance,
  onOpenDetail,
  onOpenShip,
  onFeedbackSent,
  pendingAction,
  colorByCycle = false,
}: {
  row: AdminCycleRow;
  onAdvance: (cycleId: string, target: CycleStatus) => void;
  onOpenDetail: (row: AdminCycleRow) => void;
  onOpenShip: (row: AdminCycleRow) => void;
  onFeedbackSent?: () => void;
  pendingAction: ProductionPendingAction | null;
  colorByCycle?: boolean;
}) {
  const quick = nextQuickAction(row.status);
  const rollbackTargets = getCycleRollbackTargets(row.status);
  const isCardBusy = pendingAction?.cycleId === row.id;
  const cycleVisual = colorByCycle
    ? getProductionCycleVisual(row.cycle_number)
    : null;
  const cyclePaidAt = kanbanCyclePaidAt(row);

  function isButtonBusy(target: CycleStatus) {
    return (
      pendingAction?.cycleId === row.id && pendingAction.target === target
    );
  }

  const cardTone = colorByCycle
    ? productionCycleCardClasses(
        row.cycle_number,
        row.paymentPendingHighlight
      )
    : row.paymentPendingHighlight
      ? 'border-amber-500/50 bg-amber-500/5 hover:border-amber-500/70'
      : adminPlanCardClasses(row.planSlug, row.planName);

  return (
    <article
      className={`relative overflow-hidden rounded border p-3 transition duration-200 hover:brightness-110 ${
        colorByCycle ? '' : 'admin-panel'
      } ${cardTone}`}
    >
      {isCardBusy ? (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded bg-zinc-950/75 backdrop-blur-[1px]"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="h-5 w-5 animate-spin text-console" />
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-400">
            Salvando…
          </span>
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => onOpenDetail(row)}
        className="block w-full cursor-pointer space-y-2 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {cycleVisual ? (
              <p
                className={`font-mono text-[10px] font-medium uppercase tracking-[0.16em] ${cycleVisual.headingClass}`}
              >
                {cycleVisual.label}
              </p>
            ) : null}
            <p className="text-sm font-medium text-zinc-200">
              {row.customerName ?? 'Cliente sem nome'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {row.subscriptionBillingTerm &&
            isComboTerm(row.subscriptionBillingTerm as BillingTerm) ? (
              <ComboBadge
                term={row.subscriptionBillingTerm as BillingTerm}
                compact
              />
            ) : null}
            {row.paymentPendingHighlight ? (
              <span className="rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-200">
                Pag. pendente
              </span>
            ) : null}
            {row.subscriptionStatus === 'cancelled' ? (
              <span className="rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-red-300">
                Cancelado
              </span>
            ) : null}
            {row.isPartner ? (
              <span className="rounded border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-violet-300">
                Parceiro
              </span>
            ) : null}
            {row.isStandaloneStoreOrder ? (
              <span className="rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-sky-300">
                Loja avulsa
              </span>
            ) : cycleVisual ? null : (
              <ProductionMonthBadge
                productionMonthKey={resolveProductionMonthKey({
                  scheduledProductionMonth: row.scheduledProductionMonth,
                  paid_at: row.paid_at,
                  created_at: row.created_at,
                })}
                paidAt={row.paid_at}
                cycleNumber={row.cycle_number}
                compact
              />
            )}
            {row.feedbackRequestSentAt && !row.isStandaloneStoreOrder ? (
              <span
                className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-300"
                title={`E-mail de avaliação enviado em ${formatDateTime(row.feedbackRequestSentAt)}`}
              >
                Feedback enviado
              </span>
            ) : null}
          </div>
        </div>
        {row.customerEmail ? (
          <p className="truncate font-mono text-[10px] text-zinc-600">
            {row.customerEmail}
          </p>
        ) : null}
        {row.productionNotes ? (
          <CycleProductionNotesHighlight notes={row.productionNotes} compact />
        ) : null}
        <dl className="grid gap-1 text-[11px] text-zinc-500">
          {cyclePaidAt ? (
            <div className="flex justify-between gap-2">
              <dt>Compra</dt>
              <dd className="text-zinc-400">
                {formatDate(cyclePaidAt)}
              </dd>
            </div>
          ) : null}
          {row.planName ? (
            <div className="flex justify-between gap-2">
              <dt>Plano</dt>
              <dd>
                <AdminPlanChip
                  slug={row.planSlug}
                  name={row.planName}
                  compact
                />
              </dd>
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
          {!row.isPartner && row.totalRevenueCents != null ? (
            <div className="flex justify-between gap-2">
              <dt>Receita envio</dt>
              <dd className="font-mono text-zinc-300">
                {formatMoney(row.totalRevenueCents)}
                {row.hasBundledRevenue ? (
                  <span className="ml-1 text-[9px] text-violet-300">+ extras</span>
                ) : null}
              </dd>
            </div>
          ) : null}
          {!row.isPartner && row.shipmentMarginCents != null ? (
            <div className="flex justify-between gap-2">
              <dt>Margem</dt>
              <dd
                className={`font-mono ${
                  row.shipmentMarginCents >= 0
                    ? 'text-emerald-300'
                    : 'text-red-400'
                }`}
              >
                {formatMoney(row.shipmentMarginCents)}
              </dd>
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

      {row.status === 'delivered' && !row.isStandaloneStoreOrder ? (
        <div className="mt-3 border-t border-zinc-800/80 pt-3">
          <SendFeedbackEmailButton
            cycleId={row.id}
            feedbackRequestSentAt={row.feedbackRequestSentAt}
            compact
            onSent={onFeedbackSent}
          />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-800/80 pt-3">
        {row.status === 'preparing' ? (
          <button
            type="button"
            onClick={() => onOpenShip(row)}
            className={`inline-flex flex-1 cursor-pointer items-center justify-center rounded border border-console/30 bg-console/10 px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-console transition duration-200 hover:bg-console/20 ${
              colorByCycle ? 'min-h-11' : 'min-h-[32px]'
            }`}
          >
            Registrar envio
          </button>
        ) : quick ? (
          <button
            type="button"
            disabled={isCardBusy}
            onClick={() => onAdvance(row.id, quick.target)}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded border border-zinc-700 px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-300 transition duration-200 hover:border-console/40 hover:text-console disabled:opacity-50 ${
              colorByCycle ? 'min-h-11' : 'min-h-[32px]'
            }`}
          >
            {isButtonBusy(quick.target) ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : null}
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
              disabled={isCardBusy}
              onClick={() => onAdvance(row.id, rollbackTarget)}
              className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded border border-amber-500/25 bg-amber-500/5 px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-200/90 transition duration-200 hover:border-amber-500/40 hover:bg-amber-500/10 disabled:opacity-50 ${
                colorByCycle ? 'min-h-11' : 'min-h-[32px]'
              }`}
            >
              {isButtonBusy(rollbackTarget) ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : null}
              {rollbackLabel}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onOpenDetail(row)}
          className={`inline-flex cursor-pointer items-center justify-center rounded border border-zinc-800 px-2 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-500 transition duration-200 hover:border-zinc-700 hover:text-zinc-300 ${
            colorByCycle ? 'min-h-11' : 'min-h-[32px]'
          }`}
        >
          Detalhes
        </button>
      </div>

      <ProductionSlaStrip
        paidAt={cyclePaidAt}
        status={row.status}
        shippedAt={row.shipped_at}
      />
    </article>
  );
}

function groupRowsByCycle(rows: AdminCycleRow[]): Array<{
  cycleNumber: number;
  rows: AdminCycleRow[];
}> {
  const byCycle = new Map<number, AdminCycleRow[]>();
  for (const row of rows) {
    const cycleNumber = row.cycle_number >= 1 ? row.cycle_number : 1;
    const list = byCycle.get(cycleNumber) ?? [];
    list.push(row);
    byCycle.set(cycleNumber, list);
  }

  return Array.from(byCycle.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([cycleNumber, grouped]) => ({ cycleNumber, rows: grouped }));
}

export default function ProductionKanban({
  board,
  counts,
  onOpenDetail,
  onOpenShip,
  columns = KANBAN_COLUMNS,
  groupByCycle = false,
}: Props) {
  const router = useRouter();
  const [optimisticBoard, setOptimisticBoard] =
    useState<ProductionKanbanBoard | null>(null);
  const [pendingAction, setPendingAction] = useState<ProductionPendingAction | null>(null);
  const [error, setError] = useState('');

  const displayBoard = optimisticBoard ?? board;
  const gridClass =
    columns.length <= 2 ? 'grid gap-4 xl:grid-cols-2' : 'grid gap-4 xl:grid-cols-5';

  useEffect(() => {
    setOptimisticBoard(null);
  }, [board]);

  function handleAdvance(cycleId: string, target: CycleStatus) {
    setPendingAction({ cycleId, target });
    setError('');

    setOptimisticBoard((current) => {
      const base = current ?? board;
      return moveCardInBoard(base, cycleId, target, columns) ?? current;
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

  return (
    <div className="space-y-4">
      {error ? (
        <p className="admin-panel rounded px-4 py-3 font-mono text-xs text-red-400">
          {error}
        </p>
      ) : null}

      <div className={gridClass}>
        {columns.map((status) => {
          const meta = COLUMN_META[status];
          const cards = displayBoard[status];
          const cycleGroups = groupByCycle ? groupRowsByCycle(cards) : null;

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
                ) : cycleGroups ? (
                  cycleGroups.map((group) => (
                    <div key={group.cycleNumber} className="space-y-2">
                      <p className="sticky top-0 z-[1] bg-zinc-950/90 px-1 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500 backdrop-blur-sm">
                        Ciclo {group.cycleNumber}
                        <span className="ml-2 tabular-nums text-zinc-600">
                          {group.rows.length}
                        </span>
                      </p>
                      {group.rows.map((row) => (
                        <ProductionKanbanCard
                          key={row.id}
                          row={row}
                          pendingAction={pendingAction}
                          onAdvance={handleAdvance}
                          onOpenDetail={onOpenDetail}
                          onOpenShip={onOpenShip}
                          onFeedbackSent={() => router.refresh()}
                        />
                      ))}
                    </div>
                  ))
                ) : (
                  cards.map((row) => (
                    <ProductionKanbanCard
                      key={row.id}
                      row={row}
                      pendingAction={pendingAction}
                      onAdvance={handleAdvance}
                      onOpenDetail={onOpenDetail}
                      onOpenShip={onOpenShip}
                      onFeedbackSent={() => router.refresh()}
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
