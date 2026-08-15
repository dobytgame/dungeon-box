import ProductionStatusTabs from '@/components/admin/ProductionStatusTabs';
import ProductionWorkspace from '@/components/admin/ProductionWorkspace';
import SyncCyclesButton from '@/components/admin/SyncCyclesButton';
import { requireAdmin } from '@/lib/admin/auth';
import {
  buildProductionCycleNavigator,
  defaultProductionCycleNumber,
  parseProductionCycleNumber,
  productionCycleLabel,
} from '@/lib/admin/production-cycle-nav';
import {
  buildProductionKanbanFromCycles,
  buildProductionOverviewBoard,
  getAdminCycleStatusCounts,
  listAdminCycles,
  listAdminProductionEnrichedCycles,
} from '@/lib/admin/queries';
import {
  listStandaloneStoreOrdersForProduction,
  pseudoRowsForStandaloneCycleCounts,
} from '@/lib/admin/standalone-store-production';
import { PRODUCTION_PIPELINE } from '@/lib/subscriptions/cycle-production';

interface Props {
  searchParams: Promise<{
    status?: string;
    view?: string;
    ciclo?: string;
    month?: string;
  }>;
}

const ARCHIVE_STATUSES = new Set(['cancelled', 'failed', 'all']);

function parseViewMode(raw: string | undefined): 'kanban' | 'list' | 'andamento' {
  if (raw === 'list') return 'list';
  if (raw === 'andamento') return 'andamento';
  return 'kanban';
}

export default async function AdminCyclesPage({ searchParams }: Props) {
  const { admin } = await requireAdmin();
  const { status = 'preparing', view, ciclo } = await searchParams;
  const viewMode = parseViewMode(view);
  const showArchiveList = ARCHIVE_STATUSES.has(status);

  const [enrichedCycles, rawCounts, archiveCycles, standaloneOrders] =
    await Promise.all([
    showArchiveList
      ? Promise.resolve([])
      : listAdminProductionEnrichedCycles(admin),
    getAdminCycleStatusCounts(admin),
    showArchiveList
      ? listAdminCycles(admin, { cycleStatus: status, limit: 100 })
      : Promise.resolve([]),
    showArchiveList
      ? Promise.resolve([])
      : listStandaloneStoreOrdersForProduction(admin),
  ]);

  const navigatorSource = [
    ...enrichedCycles,
    ...pseudoRowsForStandaloneCycleCounts(standaloneOrders),
  ];
  const cycleNav = buildProductionCycleNavigator(navigatorSource);
  const productionCycle =
    parseProductionCycleNumber(ciclo) ??
    defaultProductionCycleNumber(navigatorSource);
  const isAndamento = viewMode === 'andamento';
  const board = showArchiveList
    ? buildProductionKanbanFromCycles([])
    : isAndamento
      ? buildProductionOverviewBoard(enrichedCycles, { standaloneOrders })
      : buildProductionKanbanFromCycles(enrichedCycles, {
          cycleNumber: productionCycle,
          standaloneOrders,
        });

  const counts = {
    ...rawCounts,
    upcoming: board.upcoming.length,
    production: board.production.length,
    preparing: board.preparing.length,
    shipped: board.shipped.length,
    delivered: board.delivered.length,
  };

  const cycleLabel = productionCycleLabel(productionCycle);

  return (
    <div className="space-y-6">
      <div className="admin-panel flex flex-wrap items-center justify-between gap-3 rounded p-4">
        <p className="max-w-2xl text-sm text-zinc-500">
          {showArchiveList ? (
            <>
              Lista de pedidos fora do fluxo principal (cancelados, falhas ou
              histórico completo). Clique em uma linha para abrir o pedido.
            </>
          ) : viewMode === 'andamento' ? (
            <>
              Dois quadros: o que está em <strong className="text-zinc-300">produção</strong> e o que está em{' '}
              <strong className="text-zinc-300">preparo</strong>, de todos os ciclos. A cor do cartão mostra o ciclo.
            </>
          ) : viewMode === 'list' ? (
            <>
              Pedidos do <strong className="text-zinc-300">{cycleLabel}</strong>{' '}
              em lista, agrupados por processo. Clique na linha para abrir o pedido
              em modal.
            </>
          ) : (
            <>
              Kanban do <strong className="text-zinc-300">{cycleLabel}</strong>.
              Cada ciclo é o kit correspondente — independente do mês no
              calendário. Clique no cartão para abrir o pedido; use{' '}
              <strong className="text-zinc-300">Registrar envio</strong> para
              informar o rastreio.
            </>
          )}
        </p>
        <SyncCyclesButton />
      </div>

      <ProductionWorkspace
        board={board}
        cycleNav={cycleNav}
        productionCycle={productionCycle}
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
        productionCycle={
          showArchiveList || isAndamento ? undefined : productionCycle
        }
      />

      {!showArchiveList ? (
        <p className="font-mono text-[11px] text-zinc-600">
          {isAndamento ? (
            <>
              {counts.production} produção · {counts.preparing} em preparo
              {' · '}todos os ciclos
            </>
          ) : (
            <>
              {PRODUCTION_PIPELINE.map((step, index) => (
                <span key={step}>
                  {index > 0 ? ' → ' : ''}
                  {counts[step]}{' '}
                  {step === 'upcoming'
                    ? 'aguardando'
                    : step === 'production'
                      ? 'produção'
                      : step === 'preparing'
                        ? 'em preparo'
                        : step === 'shipped'
                          ? 'enviados'
                          : 'entregues'}
                </span>
              ))}
              {' · '}
              {cycleLabel}
            </>
          )}
        </p>
      ) : null}
    </div>
  );
}
