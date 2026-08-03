export const BRAZIL_TIMEZONE = 'America/Sao_Paulo';
export const BRAZIL_UTC_OFFSET = '-03:00';

function parseBrazilDateInput(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.includes('T')) {
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(`${trimmed}T12:00:00${BRAZIL_UTC_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Data formatada no fuso de Brasília. */
export function formatBrazilDate(
  value: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return '—';
  const date = parseBrazilDateInput(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(date);
}

/** Data e hora formatadas no fuso de Brasília. */
export function formatBrazilDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = parseBrazilDateInput(value);
  if (!date) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** `03/08/2026 - 15:20:24` no fuso de Brasília. */
export function formatBrazilDateTimeSeconds(
  value: string | null | undefined
): string {
  if (!value) return '—';
  const date = parseBrazilDateInput(value);
  if (!date) return '—';
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${get('day')}/${get('month')}/${get('year')} - ${get('hour')}:${get('minute')}:${get('second')}`;
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD no fuso de Brasília. */
export function toBrazilDateKey(isoTimestamp: string): string {
  const trimmed = isoTimestamp.trim();
  if (!trimmed) return trimmed;

  // Datas sem horário (ex.: paymentDate do Asaas) já representam o dia civil no Brasil.
  if (DATE_ONLY_PATTERN.test(trimmed)) {
    return trimmed;
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(trimmed));
}

/** Hoje (YYYY-MM-DD) no fuso de Brasília. */
export function todayBrazilDateKey(now = new Date()): string {
  return toBrazilDateKey(now.toISOString());
}

/** Soma dias a uma chave YYYY-MM-DD (calendário Brasil). */
export function addBrazilDays(dateKey: string, delta: number): string {
  const ms = new Date(`${dateKey}T12:00:00${BRAZIL_UTC_OFFSET}`).getTime();
  if (Number.isNaN(ms)) return dateKey;
  return toBrazilDateKey(new Date(ms + delta * 86_400_000).toISOString());
}

/** Lista dias inclusivos entre from e to (YYYY-MM-DD). */
export function eachBrazilDay(from: string, to: string): string[] {
  const days: string[] = [];
  let cursor = from;

  while (cursor <= to) {
    days.push(cursor);
    cursor = addBrazilDays(cursor, 1);
  }

  return days;
}

/** Rótulo curto para gráficos (ex.: "3 de ago."). */
export function formatBrazilDayLabel(dateKey: string): string {
  const date = parseBrazilDateInput(dateKey);
  if (!date) return dateKey;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRAZIL_TIMEZONE,
    day: 'numeric',
    month: 'short',
  }).format(date);
}

/** paid_at real do gateway: preserva existente, depois data do provedor, depois agora. */
export function resolveGatewayPaidAt(
  existingPaidAt: string | null | undefined,
  gatewayPaidAt: string | null | undefined,
  now = new Date().toISOString()
): string {
  if (existingPaidAt?.trim()) return existingPaidAt.trim();

  const gateway = gatewayPaidAt?.trim();
  if (!gateway) return now;

  if (DATE_ONLY_PATTERN.test(gateway)) {
    return parseBrazilDateOnlyToIso(gateway);
  }

  const parsed = new Date(gateway);
  return Number.isNaN(parsed.getTime()) ? now : parsed.toISOString();
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
