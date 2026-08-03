export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';
export const BRAZIL_UTC_OFFSET = '-03:00';

/** YYYY-MM-DD no fuso de Brasília. */
export function toBrazilDateKey(isoTimestamp: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(isoTimestamp));
}

/** Início do dia (00:00 BRT) em ISO UTC. */
export function brazilDateToStartIso(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00${BRAZIL_UTC_OFFSET}`).toISOString();
}

/** Fim do dia (23:59:59.999 BRT) em ISO UTC. */
export function brazilDateToEndIso(dateKey: string): string {
  return new Date(`${dateKey}T23:59:59.999${BRAZIL_UTC_OFFSET}`).toISOString();
}

/** Datas YYYY-MM-DD vindas do Asaas (sem horário) representam o dia no Brasil. */
export function parseBrazilDateOnlyToIso(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00${BRAZIL_UTC_OFFSET}`).toISOString();
}

export function earliestIsoTimestamp(
  ...timestamps: Array<string | null | undefined>
): string | null {
  let earliest: string | null = null;
  let earliestMs = Infinity;

  for (const raw of timestamps) {
    if (!raw) continue;
    const ms = new Date(raw).getTime();
    if (Number.isNaN(ms) || ms >= earliestMs) continue;
    earliestMs = ms;
    earliest = raw;
  }

  return earliest;
}
