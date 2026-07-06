'use client';

import type { AdminCycleRow } from '@/lib/admin/types';
import type { ProductionKanbanBoard } from '@/lib/admin/queries';
import {
  formatProductionProductLabel,
  PRODUCTION_BOARD_COLUMNS,
  PRODUCTION_SECTION_META,
} from '@/lib/admin/production-list';
import { formatDate } from '@/lib/dashboard/format';
import CycleProductionNotesHighlight from '@/components/admin/CycleProductionNotesHighlight';
import AdminPlanChip from '@/components/admin/AdminPlanChip';
import { getAdminPlanVisual } from '@/lib/plan-theme';

interface Props {
  board: ProductionKanbanBoard;
  onOpenDetail: (row: AdminCycleRow) => void;
}

export default function ProductionListView({ board, onOpenDetail }: Props) {
  const totalRows = PRODUCTION_BOARD_COLUMNS.reduce(
    (sum, status) => sum + board[status].length,
    0
  );

  if (totalRows === 0) {
    return (
      <p className="admin-panel rounded px-4 py-16 text-center font-mono text-xs text-zinc-600">
        Nenhum pedido na fila de produção.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {PRODUCTION_BOARD_COLUMNS.map((status) => {
        const rows = board[status];
        const meta = PRODUCTION_SECTION_META[status];

        return (
          <section
            key={status}
            className="overflow-hidden rounded border border-zinc-800/90 bg-zinc-950/40"
          >
            <header className="border-b border-zinc-800/90 bg-zinc-900/40 px-4 py-4 md:px-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                    Processo
                  </p>
                  <h3 className="mt-1 font-mono text-sm font-medium uppercase tracking-[0.16em] text-zinc-200">
                    {meta.label}
                  </h3>
                </div>
                <span className="rounded border border-zinc-800 bg-zinc-950 px-2.5 py-1 font-mono text-[11px] tabular-nums text-zinc-400">
                  {rows.length} pedido{rows.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-600">
                {meta.hint}
              </p>
            </header>

            {rows.length === 0 ? (
              <p className="px-4 py-10 text-center font-mono text-[10px] text-zinc-600 md:px-5">
                Nenhum pedido nesta etapa.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800/80 bg-zinc-950/60">
                      <th className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500 md:px-5">
                        Nome
                      </th>
                      <th className="min-w-[240px] px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500 md:px-5">
                        Endereço de envio
                      </th>
                      <th className="min-w-[180px] px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500 md:px-5">
                        Produto
                      </th>
                      <th className="min-w-[200px] px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500 md:px-5">
                        Comentário
                      </th>
                      <th className="whitespace-nowrap px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500 md:px-5">
                        Data de compra
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const planVisual = getAdminPlanVisual(
                        row.planSlug,
                        row.planName
                      );

                      return (
                      <tr
                        key={row.id}
                        className={`group cursor-pointer border-b transition-colors last:border-0 hover:brightness-110 ${
                          row.paymentPendingHighlight
                            ? 'border-amber-500/25 bg-amber-500/[0.04] hover:bg-amber-500/[0.07]'
                            : planVisual
                              ? planVisual.rowClass
                              : 'border-zinc-800/60'
                        }`}
                        onClick={() => onOpenDetail(row)}
                      >
                        <td className="px-4 py-4 align-top md:px-5">
                          <div className="min-w-[160px]">
                            <p className="font-medium text-zinc-200 group-hover:text-console">
                              {row.customerName ?? 'Cliente sem nome'}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              {row.paymentPendingHighlight ? (
                                <span className="rounded border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-200">
                                  Pag. pendente
                                </span>
                              ) : null}
                              {row.isPartner ? (
                                <span className="rounded border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-violet-300">
                                  Parceiro
                                </span>
                              ) : null}
                              {row.customerEmail ? (
                                <span className="truncate font-mono text-[10px] text-zinc-600">
                                  {row.customerEmail}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top md:px-5">
                          <p className="max-w-xl text-[13px] leading-relaxed text-zinc-400">
                            {row.shippingAddressLine ??
                              (row.city && row.state
                                ? `${row.city}/${row.state}`
                                : '—')}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top md:px-5">
                          <div className="space-y-2">
                            {row.planName ? (
                              <AdminPlanChip
                                slug={row.planSlug}
                                name={row.planName}
                                compact
                              />
                            ) : null}
                            <p className="max-w-sm text-[13px] leading-relaxed text-zinc-300">
                              {formatProductionProductLabel(row)}
                            </p>
                            {row.hasBundledItems ? (
                              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-violet-300/80">
                                Com itens extras
                              </p>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top md:px-5">
                          {row.productionNotes ? (
                            <CycleProductionNotesHighlight
                              notes={row.productionNotes}
                              compact
                            />
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 align-top font-mono text-xs tabular-nums text-zinc-400 md:px-5">
                          {row.paid_at ? formatDate(row.paid_at) : '—'}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
