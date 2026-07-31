import type { AdminNotificationType } from '@/lib/admin/notifications';

export type AdminNotificationCategory = 'store' | 'subscription' | 'all';

const STORE_TYPES = new Set<AdminNotificationType>([
  'store_order_payment_pending',
  'store_order_payment_approved',
  'store_order_payment_failed',
]);

const SUBSCRIPTION_TYPES = new Set<AdminNotificationType>([
  'subscription_pending',
  'subscription_activated',
  'subscription_payment_failed',
  'subscription_renewal_paid',
  'subscription_cancelled',
]);

export function getAdminNotificationCategory(
  type: AdminNotificationType
): Exclude<AdminNotificationCategory, 'all'> {
  if (STORE_TYPES.has(type)) return 'store';
  return 'subscription';
}

export function adminNotificationCategoryLabel(
  category: Exclude<AdminNotificationCategory, 'all'>
): string {
  return category === 'store' ? 'Loja' : 'Assinatura';
}

export function adminNotificationTypeLabel(type: AdminNotificationType): string {
  switch (type) {
    case 'store_order_payment_pending':
      return 'Aguardando pagamento';
    case 'store_order_payment_approved':
      return 'Pago';
    case 'store_order_payment_failed':
      return 'Recusado';
    case 'subscription_pending':
      return 'Checkout iniciado';
    case 'subscription_activated':
      return 'Ativada';
    case 'subscription_payment_failed':
      return 'Falha no pagamento';
    case 'subscription_renewal_paid':
      return 'Renovação paga';
    case 'subscription_cancelled':
      return 'Cancelada';
    default:
      return type;
  }
}

export function adminNotificationDefaultTitle(type: AdminNotificationType): string {
  switch (type) {
    case 'store_order_payment_pending':
      return 'Novo pedido — aguardando pagamento';
    case 'store_order_payment_approved':
      return 'Pedido pago na loja';
    case 'store_order_payment_failed':
      return 'Pagamento recusado na loja';
    case 'subscription_pending':
      return 'Nova assinatura — aguardando pagamento';
    case 'subscription_activated':
      return 'Assinatura ativada';
    case 'subscription_payment_failed':
      return 'Falha no pagamento da assinatura';
    case 'subscription_renewal_paid':
      return 'Renovação de assinatura paga';
    case 'subscription_cancelled':
      return 'Assinatura cancelada';
    default:
      return 'Notificação';
  }
}

export function resolveAdminNotificationHref(input: {
  type: AdminNotificationType;
  paymentId?: string | null;
  orderId?: string | null;
  subscriptionId?: string | null;
}): string {
  if (getAdminNotificationCategory(input.type) === 'store') {
    if (input.paymentId) {
      return `/admin/loja/pedidos?paymentId=${encodeURIComponent(input.paymentId)}`;
    }
    return '/admin/loja/pedidos';
  }

  if (input.subscriptionId) {
    return `/admin/assinaturas/${encodeURIComponent(input.subscriptionId)}`;
  }

  return '/admin/assinaturas';
}

export function adminNotificationMatchesCategory(
  type: AdminNotificationType,
  category: AdminNotificationCategory
): boolean {
  if (category === 'all') return true;
  return getAdminNotificationCategory(type) === category;
}
