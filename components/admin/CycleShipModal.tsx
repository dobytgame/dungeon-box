'use client';

import { useRouter } from 'next/navigation';
import CycleShipForm from '@/components/admin/CycleShipForm';
import AdminModal from '@/components/admin/AdminModal';
import { DEFAULT_SHIPPING_CARRIER } from '@/lib/shipping/carrier';

interface Props {
  open: boolean;
  cycleId: string | null;
  cycleLabel?: string;
  defaultCarrier?: string;
  defaultShippingCostCents?: number | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CycleShipModal({
  open,
  cycleId,
  cycleLabel,
  defaultCarrier = DEFAULT_SHIPPING_CARRIER,
  defaultShippingCostCents = null,
  onClose,
  onSuccess,
}: Props) {
  const router = useRouter();

  if (!cycleId) return null;

  return (
    <AdminModal
      open={open}
      onClose={onClose}
      title="Registrar envio"
      description={
        cycleLabel
          ? `${cycleLabel} · informe rastreio e custo do envio para mover o pedido para Enviado.`
          : 'Informe o código de rastreio e o custo do envio para mover o pedido para Enviado.'
      }
    >
      <CycleShipForm
        cycleId={cycleId}
        defaultCarrier={defaultCarrier}
        defaultShippingCostCents={defaultShippingCostCents}
        onSuccess={() => {
          router.refresh();
          onSuccess?.();
          onClose();
        }}
      />
    </AdminModal>
  );
}
