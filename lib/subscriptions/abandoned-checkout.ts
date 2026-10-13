/** Checkout que não chegou a virar assinatura. Não conta como cancelamento nem churn. */
export const ABANDONED_CHECKOUT_CANCEL_REASON = 'Tentativa de checkout abandonada';

export function isAbandonedCheckoutCancellation(
  cancelReason: string | null | undefined
): boolean {
  return cancelReason?.trim() === ABANDONED_CHECKOUT_CANCEL_REASON;
}

/**
 * Mantém assinaturas ativas e cancelamentos reais.
 * Some as linhas canceladas só porque o checkout foi abandonado.
 */
export function excludeAbandonedCheckoutCancellations<
  T extends { or: (filters: string) => T },
>(query: T): T {
  return query.or(
    `status.neq.cancelled,cancel_reason.is.null,cancel_reason.neq."${ABANDONED_CHECKOUT_CANCEL_REASON}"`
  );
}
