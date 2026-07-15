'use client';

import { Loader2 } from 'lucide-react';
import CycleDetailModal from '@/components/admin/CycleDetailModal';
import StoreOrderDetailPanel from '@/components/admin/StoreOrderDetailPanel';
import {
  storeOrderDetailSubtitle,
  storeOrderDetailTitle,
  useAdminStoreOrderDetail,
} from '@/components/admin/useAdminStoreOrderDetail';

interface Props {
  paymentId: string | null;
  open: boolean;
  onClose: () => void;
}

export default function StoreOrderDetailModalView({
  paymentId,
  open,
  onClose,
}: Props) {
  const { order, loading, error, loadDetail } = useAdminStoreOrderDetail(
    paymentId,
    open
  );

  return (
    <CycleDetailModal
      open={open}
      onClose={onClose}
      title={storeOrderDetailTitle(order, loading)}
      description={storeOrderDetailSubtitle(order)}
    >
      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin text-console" aria-hidden="true" />
          <span className="sr-only">Carregando pedido</span>
        </div>
      ) : error ? (
        <div className="space-y-4">
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
          {paymentId ? (
            <button
              type="button"
              onClick={() => void loadDetail(paymentId)}
              className="cursor-pointer rounded border border-zinc-700 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-300"
            >
              Tentar novamente
            </button>
          ) : null}
        </div>
      ) : order ? (
        <StoreOrderDetailPanel order={order} onUpdated={() => {
          if (paymentId) void loadDetail(paymentId);
        }} />
      ) : null}
    </CycleDetailModal>
  );
}
