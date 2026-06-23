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
import ProductionKanban from '@/components/admin/ProductionKanban';

interface Props {
  board: ProductionKanbanBoard;
  counts: {
    cancelled: number;
    failed: number;
  };
  archiveCycles: AdminCycleRow[];
  showArchiveList: boolean;
  archiveStatus: string;
}

function cycleLabel(
  row: Pick<AdminCycleRow, 'cycle_number' | 'customerName'>
) {
  const name = row.customerName ?? 'Cliente';
  return `#${row.cycle_number} · ${name}`;
}

export default function ProductionWorkspace({
  board,
  counts,
  archiveCycles,
  showArchiveList,
  archiveStatus,
}: Props) {
  const router = useRouter();
  const [detailCycleId, setDetailCycleId] = useState<string | null>(null);
  const [shipTarget, setShipTarget] = useState<{
    cycleId: string;
    label: string;
    defaultCarrier: string;
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
    });
  }, []);

  const openShipFromDetail = useCallback((detail: AdminCycleDetailView) => {
    setShipTarget({
      cycleId: detail.id,
      label: cycleLabel({
        cycle_number: detail.cycle_number,
        customerName: detail.customerName,
      }),
      defaultCarrier: detail.carrier ?? 'Correios',
    });
  }, []);

  return (
    <>
      <ProductionKanban
        board={board}
        counts={counts}
        onOpenDetail={openDetail}
        onOpenShip={openShip}
      />

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
        onClose={() => setShipTarget(null)}
        onSuccess={refreshBoard}
      />
    </>
  );
}
