import ProductionStatusTabs from '@/components/admin/ProductionStatusTabs';
import ProductionWorkspace from '@/components/admin/ProductionWorkspace';
import SyncCyclesButton from '@/components/admin/SyncCyclesButton';
import { requireAdmin } from '@/lib/admin/auth';
import {
  getAdminCycleStatusCounts,
  listAdminCycles,
  listAdminProductionKanban,
} from '@/lib/admin/queries';
import { PRODUCTION_PIPELINE } from '@/lib/subscriptions/cycle-production';

interface Props {
  searchParams: Promise<{ status?: string; view?: string }>;
}

const ARCHIVE_STATUSES = new Set(['cancelled', 'failed', 'all']);

function parseViewMode(raw: string | undefined): 'kanban' | 'list' {
  return raw === 'list' ? 'list' : 'kanban';
}

export default async function AdminCyclesPage({ searchParams }: Props) {
  const { admin } = await requireAdmin();
  const { status = 'preparing', view } = await searchParams;
  const viewMode = parseViewMode(view);
  const showArchiveList = ARCHIVE_STATUSES.has(status);

  const [board, rawCounts, archiveCycles] = await Promise.all([
    listAdminProductionKanban(admin),
    getAdminCycleStatusCounts(admin),
    showArchiveList
      ? listAdminCycles(admin, { cycleStatus: status, limit: 100 })
      : Promise.resolve([]),
  ]);

  const counts = {
    ...rawCounts,
    upcoming: board.upcoming.length,
    production: board.production.length,
    preparing: board.preparing.length,
    shipped: board.shipped.length,
    delivered: board.delivered.length,
  };

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
              Visualização em lista agrupada por processo, ordenada pela data de
              compra. Mostra nome, endereço de envio, produto e pagamento. Clique
              na linha para abrir o pedido em modal.
            </>
          ) : (
            <>
              Quadro Kanban da produção, ordenado pela data de compra (quem pagou
              primeiro entra primeiro). Clique no cartão para abrir o pedido em modal;
              use <strong className="text-zinc-300">Registrar envio</strong> para
              informar o rastreio. Cada mudança de status dispara e-mail ao cliente.
              Use <strong className="text-zinc-300">Sincronizar ciclos</strong> apenas
              para remover duplicatas — não altera o status dos pedidos.
            </>
          )}
        </p>
        <SyncCyclesButton />
      </div>

      <ProductionWorkspace
        board={board}
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
          Use as abas abaixo para cancelados, falhas ou lista completa.
        </p>
      ) : null}
    </div>
  );
}
