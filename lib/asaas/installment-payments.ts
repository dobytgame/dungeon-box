import { asaasRequest } from '@/lib/asaas/client';
import { isAsaasPaymentConfirmed } from '@/lib/asaas/payment-status';

export type AsaasPaymentDetail = {
  id: string;
  status?: string;
  value?: number;
  externalReference?: string | null;
  installment?: string | null;
  installmentNumber?: number | null;
  billingType?: string;
  subscription?: string | { id?: string } | null;
  paymentDate?: string | null;
};

export async function fetchAsaasPaymentDetail(
  paymentId: string
): Promise<AsaasPaymentDetail> {
  return asaasRequest<AsaasPaymentDetail>(`/payments/${paymentId}`);
}

export async function listAsaasInstallmentPayments(
  installmentId: string
): Promise<AsaasPaymentDetail[]> {
  const response = await asaasRequest<{ data?: AsaasPaymentDetail[] }>(
    `/installments/${encodeURIComponent(installmentId)}/payments`
  );
  return response.data ?? [];
}

function pickFirstConfirmedInstallment(
  payments: AsaasPaymentDetail[]
): AsaasPaymentDetail | null {
  const confirmed = payments
    .filter((row) => isAsaasPaymentConfirmed(row.status))
    .sort(
      (a, b) =>
        (a.installmentNumber ?? Number.MAX_SAFE_INTEGER) -
        (b.installmentNumber ?? Number.MAX_SAFE_INTEGER)
    );

  if (confirmed.length === 0) return null;

  return (
    confirmed.find((row) => (row.installmentNumber ?? 1) === 1) ?? confirmed[0]
  );
}

/** Resolve cobrança confirmada, inclusive quando o parcelamento exige consulta ao grupo. */
export async function resolveConfirmedInstallmentPayment(
  payment: AsaasPaymentDetail | string
): Promise<AsaasPaymentDetail | null> {
  const detail =
    typeof payment === 'string'
      ? await fetchAsaasPaymentDetail(payment)
      : payment;

  if (isAsaasPaymentConfirmed(detail.status)) {
    return detail;
  }

  if (!detail.installment) {
    return null;
  }

  const installments = await listAsaasInstallmentPayments(detail.installment);
  return pickFirstConfirmedInstallment(installments);
}

export async function listAsaasPaymentsByExternalReference(
  customerId: string,
  externalReference: string
): Promise<AsaasPaymentDetail[]> {
  const response = await asaasRequest<{ data?: AsaasPaymentDetail[] }>(
    `/payments?customer=${encodeURIComponent(customerId)}&externalReference=${encodeURIComponent(externalReference)}&limit=20`
  );
  return response.data ?? [];
}
