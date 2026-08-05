/**
 * Helpers puros de dia de vencimento (seguros para client).
 */

function startOfUtcDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function clampBillingDay(day: number): number {
  return Math.min(28, Math.max(1, Math.trunc(day)));
}

export function extractBillingDay(
  nextBillingDate: string | Date | null | undefined
): number | null {
  if (!nextBillingDate) return null;
  const parsed =
    nextBillingDate instanceof Date
      ? nextBillingDate
      : new Date(
          typeof nextBillingDate === 'string' && nextBillingDate.includes('T')
            ? nextBillingDate
            : `${nextBillingDate}T12:00:00Z`
        );
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getUTCDate();
}

/**
 * Próxima ocorrência do dia de cobrança (1–28), mínimo D+1 UTC.
 * Ex.: hoje 05/08, dia 7 → 07/08; hoje 08/08, dia 7 → 07/09.
 */
export function resolveNextBillingDateForDay(
  billingDay: number,
  now = new Date()
): Date {
  const day = clampBillingDay(billingDay);
  const minStart = startOfUtcDay(now);
  minStart.setUTCDate(minStart.getUTCDate() + 1);

  let candidate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day)
  );

  if (candidate.getTime() < minStart.getTime()) {
    candidate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, day)
    );
  }

  return candidate;
}

/**
 * Após quitar o atraso agora: próxima renovação = dia escolhido no mês seguinte.
 * Ex.: cobra em 05/08 e muda para dia 7 → próxima 07/09.
 */
export function resolveBillingDayAfterCatchUpCharge(
  billingDay: number,
  now = new Date()
): Date {
  const day = clampBillingDay(billingDay);
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, day));
}

export function clampSubscriptionBillingDay(day: number): number {
  return clampBillingDay(day);
}
