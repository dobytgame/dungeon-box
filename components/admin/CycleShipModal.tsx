'use client';

import { useRouter } from 'next/navigation';
import CycleShipForm from '@/components/admin/CycleShipForm';
import AdminModal from '@/components/admin/AdminModal';

interface Props {
  open: boolean;
  cycleId: string | null;
  cycleLabel?: string;
  defaultCarrier?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CycleShipModal({
  open,
  cycleId,
  cycleLabel,
  defaultCarrier = 'Correios',
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
          ? `${cycleLabel} · informe o rastreio para mover o pedido para Enviado.`
          : 'Informe o código de rastreio para mover o pedido para Enviado.'
      }
    >
      <CycleShipForm
        cycleId={cycleId}
        defaultCarrier={defaultCarrier}
        onSuccess={() => {
          router.refresh();
          onSuccess?.();
          onClose();
        }}
      />
    </AdminModal>
  );
}
