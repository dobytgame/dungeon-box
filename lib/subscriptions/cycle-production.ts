import type { CycleStatus } from '@/lib/dashboard/types';

/** Etapas principais da fila de produção (ordem operacional). */
export const PRODUCTION_PIPELINE: CycleStatus[] = [
  'upcoming',
  'production',
  'preparing',
  'shipped',
  'delivered',
];

export const PRODUCTION_TAB_STATUSES: Array<{
  value: CycleStatus | 'all' | 'failed';
  label: string;
}> = [
  { value: 'upcoming', label: 'Aguardando' },
  { value: 'production', label: 'Produção' },
  { value: 'preparing', label: 'Em preparo' },
  { value: 'shipped', label: 'Enviado' },
  { value: 'delivered', label: 'Entregue' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'failed', label: 'Falha pagamento' },
  { value: 'all', label: 'Todos' },
];

const TRANSITIONS: Record<CycleStatus, CycleStatus[]> = {
  upcoming: ['production', 'cancelled'],
  production: ['preparing', 'cancelled'],
  preparing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
  failed: ['production', 'preparing', 'cancelled'],
};

/** Etapas anteriores no fluxo (correção operacional — pode pular etapas). */
export function getCycleRollbackTargets(status: CycleStatus): CycleStatus[] {
  const index = PRODUCTION_PIPELINE.indexOf(status);
  if (index <= 0) return [];
  return [...PRODUCTION_PIPELINE.slice(0, index)].reverse();
}

/** @deprecated Prefer getCycleRollbackTargets */
export function getCycleRollbackTarget(status: CycleStatus): CycleStatus | null {
  return getCycleRollbackTargets(status)[0] ?? null;
}

export function isCycleRollbackTransition(
  from: CycleStatus,
  to: CycleStatus
): boolean {
  return getCycleRollbackTargets(from).includes(to);
}

const CYCLE_STATUS_LABEL: Record<CycleStatus, string> = {
  upcoming: 'Aguardando',
  production: 'Produção',
  preparing: 'Em preparo',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
  failed: 'Falha pagamento',
};

export function cycleStatusLabel(status: CycleStatus): string {
  return CYCLE_STATUS_LABEL[status] ?? status;
}

const CYCLE_STATUS_SET = new Set<CycleStatus>([
  'upcoming',
  'production',
  'preparing',
  'shipped',
  'delivered',
  'cancelled',
  'failed',
]);

export function parseCycleStatus(value: unknown): CycleStatus | null {
  if (typeof value !== 'string') return null;
  return CYCLE_STATUS_SET.has(value as CycleStatus)
    ? (value as CycleStatus)
    : null;
}

/** Reabertura operacional após cancelamento indevido. */
export function isCycleReopenTransition(
  from: CycleStatus,
  to: CycleStatus
): boolean {
  return from === 'cancelled' && to === 'upcoming';
}

/** Limpa campos de etapas posteriores ao destino do rollback. */
export function cycleRollbackFieldClears(
  target: CycleStatus
): Record<string, null> {
  const targetIndex = PRODUCTION_PIPELINE.indexOf(target);
  const clears: Record<string, null> = {};

  if (target === 'upcoming' || targetIndex >= 0) {
    if (targetIndex < 0 || targetIndex < PRODUCTION_PIPELINE.indexOf('shipped')) {
      clears.tracking_code = null;
      clears.carrier = null;
      clears.shipped_at = null;
      clears.estimated_delivery = null;
      clears.shipping_cost_cents = null;
    }
    if (targetIndex < 0 || targetIndex < PRODUCTION_PIPELINE.indexOf('delivered')) {
      clears.delivered_at = null;
    }
  }

  if (target === 'upcoming') {
    clears.cancelled_at = null;
    clears.cancel_reason = null;
  }

  return clears;
}

export function getAllowedCycleTransitions(status: CycleStatus): CycleStatus[] {
  return TRANSITIONS[status] ?? [];
}

export function canTransitionCycle(from: CycleStatus, to: CycleStatus): boolean {
  if (from === to) return false;
  if (getAllowedCycleTransitions(from).includes(to)) return true;
  if (isCycleRollbackTransition(from, to)) return true;
  return isCycleReopenTransition(from, to);
}

export function cycleTransitionErrorMessage(
  from: CycleStatus,
  to: CycleStatus
): string {
  return `Transição de ${cycleStatusLabel(from)} para ${cycleStatusLabel(to)} não permitida.`;
}

const ROLLBACK_TARGET_LABEL: Partial<Record<CycleStatus, string>> = {
  upcoming: 'Aguardando',
  production: 'Produção',
  preparing: 'Em preparo',
  shipped: 'Enviado',
};

export function cycleRollbackLabel(
  from: CycleStatus,
  to: CycleStatus
): string | null {
  if (!isCycleRollbackTransition(from, to)) return null;
  const step = ROLLBACK_TARGET_LABEL[to];
  return step ? `Voltar para ${step}` : 'Voltar etapa';
}

export function productionActionLabel(
  from: CycleStatus,
  to: CycleStatus
): string | null {
  const rollback = cycleRollbackLabel(from, to);
  if (rollback) return rollback;

  if (from === 'upcoming' && to === 'production') return 'Iniciar produção';
  if (from === 'production' && to === 'preparing') return 'Iniciar preparo';
  if (to === 'delivered') return 'Marcar entregue';
  if (to === 'cancelled') return 'Cancelar pedido';
  if (to === 'preparing' && from === 'failed') return 'Retomar preparo';
  if (to === 'production' && from === 'failed') return 'Retomar produção';
  return null;
}

export function pipelineStepIndex(status: CycleStatus): number {
  if (status === 'cancelled' || status === 'failed') return -1;
  return PRODUCTION_PIPELINE.indexOf(status);
}

/** Ordem de compra: quem pagou primeiro entra primeiro na fila. */
export function compareCyclesByPurchaseOrder<
  T extends { paid_at?: string | null; created_at?: string | null }
>(a: T, b: T): number {
  const aPaid = a.paid_at ? new Date(a.paid_at).getTime() : Number.POSITIVE_INFINITY;
  const bPaid = b.paid_at ? new Date(b.paid_at).getTime() : Number.POSITIVE_INFINITY;
  if (aPaid !== bPaid) return aPaid - bPaid;

  const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0;
  const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0;
  return aCreated - bCreated;
}
