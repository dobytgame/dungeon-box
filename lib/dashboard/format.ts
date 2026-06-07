import { maskCep, maskCpf, maskPhone } from '@/lib/masks';
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
  upcoming: 'Próximo',
  preparing: 'Em produção',
  shipped: 'Enviado',
  delivered: 'Entregue',
  failed: 'Falhou',
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
  if (!value) return '—';
  const date = new Date(value.includes('T') ? value : `${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
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
