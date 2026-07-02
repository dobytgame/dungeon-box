/** Início da operação com dados confiáveis para gráficos admin. */
export const OPERATION_CHART_START = '2026-06-01';

export function monthKeyFromDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getOperationChartPeriod(now = new Date()): {
  from: string;
  to: string;
  monthKeys: string[];
} {
  const from = OPERATION_CHART_START;
  const to = now.toISOString().slice(0, 10);

  const [startYear, startMonth] = OPERATION_CHART_START.split('-').map(Number);
  const start = new Date(startYear, startMonth - 1, 1);
  const endMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthKeys: string[] = [];
  let cursor = new Date(start);

  while (cursor <= endMonth) {
    monthKeys.push(monthKeyFromDate(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }

  return { from, to, monthKeys };
}

export function operationChartPeriodLabel(): string {
  const [year, month] = OPERATION_CHART_START.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(
    date
  );
}
