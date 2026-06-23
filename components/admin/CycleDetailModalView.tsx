'use client';

import CycleDetailContent from '@/components/admin/CycleDetailContent';
import CycleDetailModal from '@/components/admin/CycleDetailModal';
import {
  cycleDetailSubtitle,
  cycleDetailTitle,
  useAdminCycleDetail,
} from '@/components/admin/useAdminCycleDetail';
import type { AdminCycleDetailView } from '@/lib/admin/cycle-detail-view';

interface Props {
  cycleId: string | null;
  open: boolean;
  onClose: () => void;
  onShipRequest: (detail: AdminCycleDetailView) => void;
  onUpdated?: () => void;
  disableEscape?: boolean;
}

export default function CycleDetailModalView({
  cycleId,
  open,
  onClose,
  onShipRequest,
  onUpdated,
  disableEscape = false,
}: Props) {
  const { detail, loading, error, loadDetail } = useAdminCycleDetail(cycleId, open);

  return (
    <CycleDetailModal
      open={open}
      onClose={onClose}
      title={cycleDetailTitle(detail, loading)}
      description={cycleDetailSubtitle(detail)}
      disableEscape={disableEscape}
    >
      <CycleDetailContent
        cycleId={cycleId}
        detail={detail}
        loading={loading}
        error={error}
        onRetry={cycleId ? () => void loadDetail(cycleId) : undefined}
        onShipRequest={onShipRequest}
        onUpdated={onUpdated}
        onReload={(id) => void loadDetail(id)}
      />
    </CycleDetailModal>
  );
}
