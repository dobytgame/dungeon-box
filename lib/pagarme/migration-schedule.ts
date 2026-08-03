/**
 * Regras de agenda da migração Asaas → Pagar.me (puro, seguro p/ client).
 */

function formatPagarmeDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addMonthsUtc(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

function startOfUtcDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

function parseBillingDate(
  value: string | Date | null | undefined
): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return startOfUtcDay(parsed);
}

/** Código único por tentativa (retry após falha de cartão). */
export function buildPagarmeMigrationCatchUpCode(subscriptionId: string): string {
  return `${subscriptionId}-mig-${Date.now().toString(36)}`;
}

/**
 * Em atraso (past_due) ou com next_billing_date já vencida → cobra agora.
 * Assinatura ativa com data futura → só cadastra cartão e agenda.
 */
export function migrationNeedsImmediateCharge(
  input: {
    status?: string | null;
    nextBillingDate?: string | Date | null;
  },
  now = new Date()
): boolean {
  if ((input.status ?? '').trim() === 'past_due') return true;

  const billing = parseBillingDate(input.nextBillingDate);
  if (!billing) return false;

  return billing.getTime() < startOfUtcDay(now).getTime();
}

/**
 * Para migração em dia: cobra só a partir da próxima data (ex.: cadastra 03/08, cobra 19/08).
 * Se a data já passou ou é hoje, inicia amanhã (mínimo D+1) — não usar em past_due.
 */
export function resolveMigrationStartAt(
  nextBillingDate: string | Date | null | undefined,
  now = new Date()
): Date {
  const minStart = startOfUtcDay(now);
  minStart.setUTCDate(minStart.getUTCDate() + 1);

  const renewal = parseBillingDate(nextBillingDate);
  if (!renewal) return minStart;

  return renewal.getTime() > minStart.getTime() ? renewal : minStart;
}

/**
 * Após quitar o ciclo em atraso agora: próxima renovação = +1 mês da data vencida,
 * avançando meses até ficar no mínimo D+1 (preserva o dia de cobrança).
 *
 * Ex.: vencido 19/07, hoje 03/08 → próxima 19/08.
 * Ex.: vencido 01/08, hoje 03/08 → próxima 01/09.
 */
export function resolveMigrationCatchUpStartAt(
  overdueBillingDate: string | Date | null | undefined,
  now = new Date()
): Date {
  const minStart = startOfUtcDay(now);
  minStart.setUTCDate(minStart.getUTCDate() + 1);

  let next = parseBillingDate(overdueBillingDate) ?? startOfUtcDay(now);
  next = addMonthsUtc(next, 1);

  let guard = 0;
  while (next.getTime() <= minStart.getTime() && guard < 36) {
    next = addMonthsUtc(next, 1);
    guard += 1;
  }

  return next;
}

export function formatMigrationStartAt(
  nextBillingDate: string | Date | null | undefined,
  now = new Date()
): string {
  return formatPagarmeDate(resolveMigrationStartAt(nextBillingDate, now));
}
