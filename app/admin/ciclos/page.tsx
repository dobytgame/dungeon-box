import ProductionStatusTabs from '@/components/admin/ProductionStatusTabs';
import ProductionWorkspace from '@/components/admin/ProductionWorkspace';
import SyncCyclesButton from '@/components/admin/SyncCyclesButton';
import { requireAdmin } from '@/lib/admin/auth';
import { buildProductionMonthNavigator } from '@/lib/admin/production-calendar';
import {
  defaultProductionMonthKey,
  parseProductionMonthKey,
  productionMonthLabel,
} from '@/lib/admin/production-month';
import {
  buildProductionKanbanFromCycles,
  getAdminCycleStatusCounts,
  listAdminCycles,
  listAdminProductionEnrichedCycles,
} from '@/lib/admin/queries';
import { PRODUCTION_PIPELINE } from '@/lib/subscriptions/cycle-production';

interface Props {
  searchParams: Promise<{ status?: string; view?: string; month?: string }>;
}

const ARCHIVE_STATUSES = new Set(['cancelled', 'failed', 'all']);

function parseViewMode(raw: string | undefined): 'kanban' | 'list' {
  return raw === 'list' ? 'list' : 'kanban';
}

export default async function AdminCyclesPage({ searchParams }: Props) {
  const { admin } = await requireAdmin();
  const { status = 'preparing', view, month } = await searchParams;
  const viewMode = parseViewMode(view);
  const showArchiveList = ARCHIVE_STATUSES.has(status);

  const productionMonth =
    parseProductionMonthKey(month) ?? defaultProductionMonthKey();

  const [enrichedCycles, rawCounts, archiveCycles] = await Promise.all([
    showArchiveList
      ? Promise.resolve([])
      : listAdminProductionEnrichedCycles(admin),
    getAdminCycleStatusCounts(admin),
    showArchiveList
      ? listAdminCycles(admin, { cycleStatus: status, limit: 100 })
      : Promise.resolve([]),
  ]);

  const calendarMonths = buildProductionMonthNavigator(enrichedCycles);
  const board = showArchiveList
    ? buildProductionKanbanFromCycles([])
    : buildProductionKanbanFromCycles(enrichedCycles, {
        monthKey: productionMonth,
      });

  const counts = {
    ...rawCounts,
    upcoming: board.upcoming.length,
    production: board.production.length,
    preparing: board.preparing.length,
    shipped: board.shipped.length,
    delivered: board.delivered.length,
  };

  const monthLabel = productionMonthLabel(productionMonth);

  return (
    <div className="space-y-6">
      <div className="admin-panel flex flex-wrap items-center justify-between gap-3 rounded p-4">
        <p className="max-w-2xl text-sm text-zinc-500">
          {showArchiveList ? (
            <>
              Lista de pedidos fora do fluxo principal (cancelados, falhas ou
              histórico completo). Clique em uma linha para abrir o pedido.
            </>
          ) : viewMode === 'list' ? (
            <>
              Pedidos de <strong className="text-zinc-300">{monthLabel}</strong>{' '}
              em lista, agrupados por processo. Clique na linha para abrir o pedido
              em modal.
            </>
          ) : (
            <>
              Kanban de <strong className="text-zinc-300">{monthLabel}</strong>.
              Use o calendário acima para trocar de mês. Clique no cartão para
              abrir o pedido; use <strong className="text-zinc-300">Registrar envio</strong>{' '}
              para informar o rastreio.
            </>
          )}
        </p>
        <SyncCyclesButton />
      </div>

      <ProductionWorkspace
        board={board}
        calendarMonths={calendarMonths}
        productionMonth={productionMonth}
        counts={{
          cancelled: counts.cancelled,
          failed: counts.failed,
        }}
        archiveCycles={archiveCycles}
        showArchiveList={showArchiveList}
        archiveStatus={status}
        viewMode={viewMode}
      />

      <ProductionStatusTabs
        currentStatus={status}
        counts={counts}
        currentView={showArchiveList ? undefined : viewMode}
        productionMonth={showArchiveList ? undefined : productionMonth}
      />

      {!showArchiveList ? (
        <p className="font-mono text-[11px] text-zinc-600">
          {PRODUCTION_PIPELINE.map((step, index) => (
            <span key={step}>
              {index > 0 ? ' → ' : ''}
              {counts[step]}{' '}
              {step === 'upcoming'
                ? 'aguardando'
                : step === 'preparing'
                  ? 'em preparo'
                  : step === 'shipped'
                    ? 'enviados'
                    : 'entregues'}
            </span>
          ))}
          {' · '}
          {monthLabel}
        </p>
      ) : null}
    </div>
  );
}
