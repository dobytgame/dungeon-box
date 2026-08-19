import type { CycleStatus } from '@/lib/dashboard/types';
import { pipelineStepIndex } from '@/lib/subscriptions/cycle-production';
import { DEFAULT_SHIPPING_CARRIER } from '@/lib/shipping/carrier';

/** Ciclos que ainda são “a caixa atual” na visão do assinante. */
export const OPEN_DASHBOARD_CYCLE_STATUSES: CycleStatus[] = [
  'upcoming',
  'production',
  'preparing',
  'packed',
  'awaiting_pickup',
  'shipped',
];

const CYCLE_STATUS_COPY: Record<
  CycleStatus,
  { summary: string; next?: string }
> = {
  upcoming: {
    summary: 'Pagamento confirmado. Sua caixa entra na produção em breve.',
  },
  production: {
    summary: 'Estamos imprimindo e preparando as peças do seu kit.',
    next: 'O próximo aviso é quando a caixa entrar em preparo.',
  },
  preparing: {
    summary: 'Sua caixa está sendo montada no estoque.',
    next: 'O próximo aviso é quando ela estiver embalada.',
  },
  packed: {
    summary: 'Caixa conferida e fechada.',
    next: 'Em seguida ela entra na fila de coleta da Loggi.',
  },
  awaiting_pickup: {
    summary: 'Etiqueta pronta. A caixa está na fila de coleta da Loggi.',
    next: 'O código de rastreio sai no despacho, não antes.',
  },
  shipped: {
    summary: 'Saiu para entrega. Use o código de rastreio para acompanhar.',
  },
  delivered: {
    summary: 'Entrega confirmada.',
  },
  cancelled: {
    summary: 'Este ciclo foi cancelado.',
  },
  failed: {
    summary: 'Houve uma falha no pagamento deste ciclo.',
  },
};

export function dashboardCycleStatusCopy(status: CycleStatus) {
  return CYCLE_STATUS_COPY[status];
}

export function pickCurrentDashboardCycle<
  T extends { status: CycleStatus; cycle_number: number },
>(cycles: T[]): T | null {
  const open = cycles.filter((cycle) =>
    OPEN_DASHBOARD_CYCLE_STATUSES.includes(cycle.status)
  );
  if (open.length === 0) return null;

  return [...open].sort((a, b) => {
    const step = pipelineStepIndex(b.status) - pipelineStepIndex(a.status);
    if (step !== 0) return step;
    return a.cycle_number - b.cycle_number;
  })[0];
}

export function dashboardTrackingPlaceholder(
  status: CycleStatus
): string | null {
  if (status === 'packed') {
    return 'Caixa fechada. O rastreio aparece depois da coleta.';
  }
  if (status === 'awaiting_pickup') {
    return 'Na fila da Loggi. O rastreio sai quando o pacote for coletado.';
  }
  if (
    status === 'upcoming' ||
    status === 'production' ||
    status === 'preparing'
  ) {
    return 'O rastreio sai quando a caixa for despachada.';
  }
  return null;
}

export function formatDashboardTracking(
  status: CycleStatus,
  trackingCode: string | null | undefined,
  carrier: string | null | undefined
): string {
  if (trackingCode?.trim()) {
    return `${carrier?.trim() || DEFAULT_SHIPPING_CARRIER}: ${trackingCode.trim()}`;
  }
  return dashboardTrackingPlaceholder(status) ?? '—';
}
