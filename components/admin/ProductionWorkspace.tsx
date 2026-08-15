'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminCycleRow } from '@/lib/admin/types';
import type { ProductionKanbanBoard } from '@/lib/admin/queries';
import type { AdminCycleDetailView } from '@/lib/admin/cycle-detail-view';
import ArchiveCyclesTable from '@/components/admin/ArchiveCyclesTable';
import AdminSection from '@/components/admin/AdminSection';
import CycleDetailModalView from '@/components/admin/CycleDetailModalView';
import CycleShipModal from '@/components/admin/CycleShipModal';
import ProductionCycleNav from '@/components/admin/ProductionCycleNav';
import ProductionFloorView from '@/components/admin/ProductionFloorView';
import ProductionKanban from '@/components/admin/ProductionKanban';
import ProductionListView from '@/components/admin/ProductionListView';
import AdminPlanLegend from '@/components/admin/AdminPlanLegend';
import ProductionViewToggle, {
  type ProductionViewMode,
} from '@/components/admin/ProductionViewToggle';
import type { ProductionCycleNavItem } from '@/lib/admin/production-cycle-nav';

interface Props {
  board: ProductionKanbanBoard;
  cycleNav: ProductionCycleNavItem[];
  productionCycle: number;
  counts: {
    cancelled: number;
    failed: number;
  };
  archiveCycles: AdminCycleRow[];
  showArchiveList: boolean;
  archiveStatus: string;
  viewMode: ProductionViewMode;
}

function cycleLabel(
  row: Pick<
    AdminCycleRow,
    'cycle_number' | 'customerName' | 'isStandaloneStoreOrder'
  >
) {
  const name = row.customerName ?? 'Cliente';
  if (row.isStandaloneStoreOrder) {
    return `Loja avulsa · ${name}`;
  }
  return `#${row.cycle_number} · ${name}`;
}

export default function ProductionWorkspace({
  board,
  cycleNav,
  productionCycle,
  counts,
  archiveCycles,
  showArchiveList,
  archiveStatus,
  viewMode,
}: Props) {
  const router = useRouter();
  const [detailCycleId, setDetailCycleId] = useState<string | null>(null);
  const [shipTarget, setShipTarget] = useState<{
    cycleId: string;
    label: string;
    defaultCarrier: string;
    defaultShippingCostCents: number | null;
  } | null>(null);

  const refreshBoard = useCallback(() => {
    router.refresh();
  }, [router]);

  const openDetail = useCallback((row: AdminCycleRow) => {
    setDetailCycleId(row.id);
  }, []);

  const openShip = useCallback((row: AdminCycleRow) => {
    setShipTarget({
      cycleId: row.id,
      label: cycleLabel(row),
      defaultCarrier: row.carrier ?? 'Correios',
      defaultShippingCostCents: null,
    });
  }, []);

  const openShipFromDetail = useCallback((detail: AdminCycleDetailView) => {
    setShipTarget({
      cycleId: detail.id,
      label: detail.isStandaloneStoreOrder
        ? `Loja avulsa · ${detail.customerName ?? 'Cliente'}`
        : cycleLabel({
            cycle_number: detail.cycle_number,
            customerName: detail.customerName,
          }),
      defaultCarrier: detail.carrier ?? 'Correios',
      defaultShippingCostCents: detail.shippingCostCents,
    });
  }, []);

  return (
    <>
      {!showArchiveList && viewMode !== 'andamento' ? (
        <ProductionCycleNav
          cycles={cycleNav}
          selectedCycle={productionCycle}
        />
      ) : null}

      {!showArchiveList ? (
        <div
          className={`flex flex-wrap items-center gap-3 ${
            viewMode === 'andamento' ? 'justify-end' : 'justify-between'
          }`}
        >
          {viewMode !== 'andamento' ? <AdminPlanLegend /> : null}
          <ProductionViewToggle current={viewMode} />
        </div>
      ) : null}

      {showArchiveList ? null : viewMode === 'list' ? (
        <ProductionListView board={board} onOpenDetail={openDetail} />
      ) : viewMode === 'andamento' ? (
        <ProductionFloorView
          board={board}
          onOpenDetail={openDetail}
          onOpenShip={openShip}
        />
      ) : (
        <ProductionKanban
          board={board}
          counts={counts}
          onOpenDetail={openDetail}
          onOpenShip={openShip}
        />
      )}

      {showArchiveList ? (
        <AdminSection
          title={`Lista · ${archiveCycles.length} pedido(s)`}
          action={
            archiveStatus !== 'all'
              ? { href: '/admin/ciclos?status=all', label: 'Ver todos' }
              : undefined
          }
        >
          <ArchiveCyclesTable rows={archiveCycles} onOpenDetail={openDetail} />
        </AdminSection>
      ) : null}

      <CycleDetailModalView
        cycleId={detailCycleId}
        open={detailCycleId !== null}
        onClose={() => setDetailCycleId(null)}
        onShipRequest={openShipFromDetail}
        onUpdated={refreshBoard}
        disableEscape={shipTarget !== null}
      />

      <CycleShipModal
        open={shipTarget !== null}
        cycleId={shipTarget?.cycleId ?? null}
        cycleLabel={shipTarget?.label}
        defaultCarrier={shipTarget?.defaultCarrier}
        defaultShippingCostCents={shipTarget?.defaultShippingCostCents ?? null}
        onClose={() => setShipTarget(null)}
        onSuccess={refreshBoard}
      />
    </>
  );
}
