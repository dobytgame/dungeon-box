import { parseStoreOrderMeta } from '@/lib/asaas/store-order-payment';
import { isComboTerm } from '@/lib/checkout/combo-billing';
import { getComboTermLabel } from '@/lib/checkout/combo-display';
import type { Payment } from '@/lib/dashboard/types';
import {
  isComboUpgradePayment,
  parseComboPaymentDetail,
} from '@/lib/payments/effective-amount';

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  credit_card: 'Cartão',
  pix: 'Pix',
  debit_card: 'Débito',
  ticket: 'Boleto',
};

function looksLikeJson(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

function describeStoreOrder(
  meta: NonNullable<ReturnType<typeof parseStoreOrderMeta>>
): string {
  const items = meta.items
    .map((line) =>
      line.quantity > 1 ? `${line.name} ×${line.quantity}` : line.name
    )
    .join(', ');

  const parts = [items || 'Pedido da loja'];

  if (meta.shippingMode === 'with_subscription' || meta.bundleSubscriptionId) {
    parts.push('envio com a próxima caixa');
  }

  if (meta.couponSummary) {
    parts.push(meta.couponSummary);
  } else if (meta.couponCode) {
    parts.push(`cupom ${meta.couponCode}`);
  }

  return parts.join(' · ');
}

export function formatPaymentMethod(method: string | null | undefined): string {
  if (!method) return 'Cartão';
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export function formatPaymentDescription(payment: Payment): string | null {
  const storeMeta = parseStoreOrderMeta(payment.status_detail);
  if (storeMeta) {
    return describeStoreOrder(storeMeta);
  }

  const comboDetail = parseComboPaymentDetail(payment.status_detail);
  if (comboDetail) {
    const term = comboDetail.billing_term;
    const comboLabel =
      term && isComboTerm(term) ? getComboTermLabel(term) : 'Combo';
    const prefix = isComboUpgradePayment(payment.status_detail) ? 'Upgrade ' : '';
    return `${prefix}${comboLabel}`;
  }

  if (payment.status_detail) {
    try {
      const parsed = JSON.parse(payment.status_detail) as { type?: string };
      if (parsed?.type === 'combo_installment_slice') {
        return 'Parcela do combo';
      }
    } catch {
      if (!looksLikeJson(payment.status_detail)) {
        return payment.status_detail;
      }
    }

    if (!looksLikeJson(payment.status_detail)) {
      return payment.status_detail;
    }
  }

  if (payment.subscription_id) {
    return 'Assinatura';
  }

  return null;
}
