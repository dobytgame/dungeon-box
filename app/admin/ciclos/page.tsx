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
  searchParams: Promise<{ status?: string }>;
}

const ARCHIVE_STATUSES = new Set(['cancelled', 'failed', 'all']);

export default async function AdminCyclesPage({ searchParams }: Props) {
  const { admin } = await requireAdmin();
  const { status = 'preparing' } = await searchParams;
  const showArchiveList = ARCHIVE_STATUSES.has(status);

  const [board, counts, archiveCycles] = await Promise.all([
    listAdminProductionKanban(admin),
    getAdminCycleStatusCounts(admin),
    showArchiveList
      ? listAdminCycles(admin, { cycleStatus: status, limit: 100 })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="admin-panel flex flex-wrap items-center justify-between gap-3 rounded p-4">
        <p className="max-w-2xl text-sm text-zinc-500">
          Quadro Kanban da produção. Clique no cartão para abrir o painel lateral
          com detalhes; use <strong className="text-zinc-300">Registrar envio</strong>{' '}
          para informar o rastreio sem sair da página.
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
      />

      <ProductionStatusTabs currentStatus={status} counts={counts} />

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
