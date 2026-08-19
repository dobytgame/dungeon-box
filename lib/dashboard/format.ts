import { maskCep, maskCpf, maskPhone } from '@/lib/masks';
import {
  formatBrazilDate,
  formatBrazilDateTime,
} from '@/lib/datetime/brazil';
import type { CycleStatus, PaymentStatus, SubscriptionStatus } from './types';

const subscriptionLabels: Record<SubscriptionStatus, string> = {
  pending: 'Pendente',
  active: 'Ativa',
  paused: 'Pausada',
  past_due: 'Em atraso',
  cancelled: 'Cancelada',
  expired: 'Expirada',
};

const cycleLabels: Record<CycleStatus, string> = {
  upcoming: 'Aguardando',
  production: 'Produção',
  preparing: 'Em preparo',
  packed: 'Embalado',
  awaiting_pickup: 'Aguardando coleta',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
  failed: 'Falha pagamento',
};

const paymentLabels: Record<PaymentStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  authorized: 'Autorizado',
  in_process: 'Em processamento',
  rejected: 'Recusado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  charged_back: 'Contestado',
};

export function formatSubscriptionStatus(status: SubscriptionStatus): string {
  return subscriptionLabels[status] ?? status;
}

export function formatCycleStatus(status: CycleStatus): string {
  return cycleLabels[status] ?? status;
}

export function formatPaymentStatus(status: PaymentStatus): string {
  return paymentLabels[status] ?? status;
}

export function formatMoney(cents: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

export function formatDate(
  value: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  return formatBrazilDate(value, options);
}

export function formatDateTime(value: string | null | undefined): string {
  return formatBrazilDateTime(value);
}

export function formatCpf(value: string | null | undefined): string {
  if (!value) return '—';
  const masked = maskCpf(value);
  return masked || value;
}

export function formatPhone(value: string | null | undefined): string {
  if (!value) return '—';
  const masked = maskPhone(value);
  return masked || value;
}

export function formatZip(value: string | null | undefined): string {
  if (!value) return '—';
  const masked = maskCep(value);
  return masked || value;
}

export function colorLabel(slug: string | null | undefined): string {
  if (!slug) return '—';
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function relOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}
