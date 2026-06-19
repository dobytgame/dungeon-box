import type { CycleStatus } from '@/lib/dashboard/types';

/** Etapas principais da fila de produção (ordem operacional). */
export const PRODUCTION_PIPELINE: CycleStatus[] = [
  'upcoming',
  'preparing',
  'shipped',
  'delivered',
];

export const PRODUCTION_TAB_STATUSES: Array<{
  value: CycleStatus | 'all' | 'failed';
  label: string;
}> = [
  { value: 'upcoming', label: 'Aguardando' },
  { value: 'preparing', label: 'Em preparo' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'failed', label: 'Falha pagamento' },
  { value: 'all', label: 'Todos' },
];

const TRANSITIONS: Record<CycleStatus, CycleStatus[]> = {
  upcoming: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
  failed: ['preparing', 'cancelled'],
};

export function getAllowedCycleTransitions(status: CycleStatus): CycleStatus[] {
  return TRANSITIONS[status] ?? [];
}

export function canTransitionCycle(from: CycleStatus, to: CycleStatus): boolean {
  return getAllowedCycleTransitions(from).includes(to);
}

export function productionActionLabel(
  from: CycleStatus,
  to: CycleStatus
): string | null {
  if (from === 'upcoming' && to === 'preparing') return 'Iniciar preparo';
  if (to === 'delivered') return 'Marcar entregue';
  if (to === 'cancelled') return 'Cancelar pedido';
  if (to === 'preparing' && from === 'failed') return 'Retomar preparo';
  return null;
}

export function pipelineStepIndex(status: CycleStatus): number {
  if (status === 'cancelled' || status === 'failed') return -1;
  return PRODUCTION_PIPELINE.indexOf(status);
}
