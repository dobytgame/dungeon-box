import { asaasRequest } from '@/lib/asaas/client';

export type AsaasPaymentDetails = {
  id: string;
  status?: string;
  value?: number;
  billingType?: string;
  invoiceUrl?: string | null;
  bankSlipUrl?: string | null;
  dueDate?: string | null;
  description?: string | null;
};

const PENDING_ASAAS_STATUSES = new Set([
  'PENDING',
  'OVERDUE',
  'AWAITING_RISK_ANALYSIS',
]);

export function isAsaasPaymentPending(status?: string | null): boolean {
  if (!status) return false;
  return PENDING_ASAAS_STATUSES.has(status.toUpperCase());
}

export function asaasPaymentShareUrl(payment: AsaasPaymentDetails): string | null {
  return payment.invoiceUrl?.trim() || payment.bankSlipUrl?.trim() || null;
}

export async function fetchAsaasPaymentDetails(
  paymentId: string
): Promise<AsaasPaymentDetails> {
  return asaasRequest<AsaasPaymentDetails>(`/payments/${paymentId}`);
}
