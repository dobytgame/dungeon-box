const CONFIRMED_STATUSES = new Set([
  'CONFIRMED',
  'RECEIVED',
  'RECEIVED_IN_CASH',
  'AUTHORIZED',
]);

export function isAsaasPaymentConfirmed(status?: string | null): boolean {
  if (!status) return false;
  return CONFIRMED_STATUSES.has(status.toUpperCase());
}
