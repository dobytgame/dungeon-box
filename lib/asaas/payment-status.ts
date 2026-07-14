import { isAsaasPaymentPending } from '@/lib/asaas/payment-details';

const CONFIRMED_STATUSES = new Set([
  'CONFIRMED',
  'RECEIVED',
  'RECEIVED_IN_CASH',
  'AUTHORIZED',
  'DUNNING_RECEIVED',
]);

export function isAsaasPaymentConfirmed(status?: string | null): boolean {
  if (!status) return false;
  return CONFIRMED_STATUSES.has(status.toUpperCase());
}

export function userFacingStoreCardPaymentError(status?: string | null): string {
  if (isAsaasPaymentPending(status)) {
    return 'Pagamento em análise. Aguarde a confirmação antes de tentar novamente.';
  }

  return 'Cartão recusado. Verifique os dados ou tente outro cartão.';
}
