import { toBrazilDateKey } from '@/lib/datetime/brazil';

/**
 * Cobrança no dia em que o pré-pago acaba, ou depois.
 * O vencimento do mês seguinte cai no mesmo dia civil de `prepaid_until`,
 * então comparar o timestamp (horas) trata a renovação como se ainda fosse combo.
 */
export function isOnOrAfterPrepaidEndDay(
  prepaidUntil: string | null | undefined,
  at: string | null | undefined
): boolean {
  if (!prepaidUntil || !at) return false;

  const endDay = toBrazilDateKey(prepaidUntil);
  const day = toBrazilDateKey(at);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDay) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return false;
  }

  return day >= endDay;
}
