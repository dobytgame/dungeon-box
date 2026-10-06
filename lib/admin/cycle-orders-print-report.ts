import type { SupabaseClient } from '@supabase/supabase-js';
import {
  buildProductionKanbanFromCycles,
  listAdminProductionEnrichedCycles,
  type ProductionKanbanBoard,
} from '@/lib/admin/queries';
import {
  buildProductionCycleNavigator,
  productionCycleLabel,
} from '@/lib/admin/production-cycle-nav';
import { kanbanCyclePaidAt } from '@/lib/admin/cycle-payment-resolve';
import type { AdminCycleRow } from '@/lib/admin/types';
import {
  listStandaloneStoreOrdersForProduction,
  pseudoRowsForStandaloneCycleCounts,
} from '@/lib/admin/standalone-store-production';
import {
  formatBrazilDate,
  todayBrazilDateKey,
  toBrazilDateKey,
} from '@/lib/datetime/brazil';
import { PRODUCTION_LEAD_BUSINESS_DAYS } from '@/lib/production/lead-time';
import {
  productionSlaPrintDaysLabel,
  resolveProductionSlaPrintTone,
  type ProductionSlaPrintTone,
} from '@/lib/production/sla-print-tone';
import { resolveProductionSla } from '@/lib/production/sla';
import { cycleStatusLabel } from '@/lib/subscriptions/cycle-production';
import type { CycleStatus } from '@/lib/dashboard/types';

/** Só fila interna: aguardando → embalado (sem coleta, enviado ou entregue). */
const REPORT_STATUSES = [
  'upcoming',
  'production',
  'preparing',
  'packed',
] as const satisfies readonly (keyof ProductionKanbanBoard)[];

const STAGE_CELL_STYLE: Record<(typeof REPORT_STATUSES)[number], string> = {
  upcoming: 'background:#e7e5e4;color:#44403c;font-weight:600;',
  production: 'background:#dbeafe;color:#1e3a8a;font-weight:600;',
  preparing: 'background:#e9d5ff;color:#581c87;font-weight:600;',
  packed: 'background:#fed7aa;color:#9a3412;font-weight:600;',
};

export type CycleOrdersPrintRow = {
  id: string;
  customerName: string;
  customerEmail: string;
  purchaseDateKey: string | null;
  purchaseDateLabel: string;
  planName: string;
  productionStatus: string;
  productionStage: CycleStatus;
  slaDaysLabel: string;
  tone: ProductionSlaPrintTone;
  sortOverdue: number;
  sortRemaining: number;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rowFromCycle(cycle: AdminCycleRow): CycleOrdersPrintRow {
  const paidAt = kanbanCyclePaidAt(cycle);
  const sla = resolveProductionSla({
    paidAt,
    status: cycle.status,
    shippedAt: cycle.shipped_at,
  });
  const purchaseDateKey = paidAt ? toBrazilDateKey(paidAt) : null;
  const planName = cycle.isStandaloneStoreOrder
    ? 'Pedido avulso (loja)'
    : cycle.planName?.trim() || '—';

  return {
    id: cycle.id,
    customerName: cycle.customerName?.trim() || '—',
    customerEmail: cycle.customerEmail?.trim() || '—',
    purchaseDateKey,
    purchaseDateLabel: purchaseDateKey
      ? formatBrazilDate(purchaseDateKey, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '—',
    planName,
    productionStatus: cycleStatusLabel(cycle.status),
    productionStage: cycle.status,
    slaDaysLabel: productionSlaPrintDaysLabel(sla),
    tone: resolveProductionSlaPrintTone(sla),
    sortOverdue: sla?.overdueBusinessDays ?? 0,
    sortRemaining: sla?.remainingBusinessDays ?? 9999,
  };
}

function sortPrintRows(rows: CycleOrdersPrintRow[]): CycleOrdersPrintRow[] {
  return [...rows].sort((a, b) => {
    if (a.sortOverdue !== b.sortOverdue) {
      return b.sortOverdue - a.sortOverdue;
    }
    if (a.sortRemaining !== b.sortRemaining) {
      return a.sortRemaining - b.sortRemaining;
    }
    const dateCmp = (a.purchaseDateKey ?? '').localeCompare(
      b.purchaseDateKey ?? ''
    );
    if (dateCmp !== 0) return dateCmp;
    return a.customerName.localeCompare(b.customerName, 'pt-BR');
  });
}

function flattenCycleBoardForReport(board: ProductionKanbanBoard): AdminCycleRow[] {
  const seen = new Set<string>();
  const rows: AdminCycleRow[] = [];

  for (const status of REPORT_STATUSES) {
    for (const row of board[status]) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }
  }

  return rows;
}

export function defaultCycleNumberForPrintReport(
  options: Awaited<ReturnType<typeof listCycleOrdersPrintOptions>>
): number {
  if (options.length === 0) return 1;
  return (
    options.find((item) => item.hasOpenWork)?.cycleNumber ??
    options[options.length - 1]!.cycleNumber
  );
}

export async function listCycleOrdersPrintOptions(admin: SupabaseClient) {
  const [enrichedCycles, standaloneOrders] = await Promise.all([
    listAdminProductionEnrichedCycles(admin),
    listStandaloneStoreOrdersForProduction(admin),
  ]);

  const navigatorSource = [
    ...enrichedCycles,
    ...pseudoRowsForStandaloneCycleCounts(standaloneOrders),
  ];

  return buildProductionCycleNavigator(navigatorSource);
}

export async function buildCycleOrdersPrintReport(
  admin: SupabaseClient,
  cycleNumber: number
): Promise<{ rows: CycleOrdersPrintRow[]; cycleLabel: string }> {
  if (!Number.isInteger(cycleNumber) || cycleNumber < 1) {
    throw new Error('Informe um ciclo válido.');
  }

  const [enrichedCycles, standaloneOrders] = await Promise.all([
    listAdminProductionEnrichedCycles(admin),
    listStandaloneStoreOrdersForProduction(admin),
  ]);

  const board = buildProductionKanbanFromCycles(enrichedCycles, {
    cycleNumber,
    standaloneOrders,
  });

  const rows = sortPrintRows(
    flattenCycleBoardForReport(board).map(rowFromCycle)
  );

  return {
    rows,
    cycleLabel: productionCycleLabel(cycleNumber),
  };
}

const TONE_BG: Record<ProductionSlaPrintTone, string> = {
  green: '#bbf7d0',
  yellow: '#fef08a',
  'red-light': '#fecaca',
  'red-dark': '#dc2626',
  neutral: '#e7e5e4',
};

const TONE_TEXT: Record<ProductionSlaPrintTone, string> = {
  green: '#14532d',
  yellow: '#713f12',
  'red-light': '#7f1d1d',
  'red-dark': '#ffffff',
  neutral: '#44403c',
};

export function renderCycleOrdersPrintHtml(input: {
  cycleLabel: string;
  rows: CycleOrdersPrintRow[];
  generatedAt: Date;
}): string {
  const generatedLabel = formatBrazilDate(todayBrazilDateKey(input.generatedAt), {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const tableRows =
    input.rows.length === 0
      ? `<tr><td colspan="6" class="empty">Nenhum pedido neste ciclo nas etapas Aguardando, Produção, Em preparo ou Embalado.</td></tr>`
      : input.rows
          .map((row) => {
            const stageStyle =
              row.productionStage in STAGE_CELL_STYLE
                ? STAGE_CELL_STYLE[
                    row.productionStage as (typeof REPORT_STATUSES)[number]
                  ]
                : 'background:#f5f5f4;color:#44403c;font-weight:600;';
            return `
        <tr>
          <td>${escapeHtml(row.customerName)}</td>
          <td class="email">${escapeHtml(row.customerEmail)}</td>
          <td class="stage" style="${stageStyle}">${escapeHtml(row.productionStatus)}</td>
          <td class="num">${escapeHtml(row.purchaseDateLabel)}</td>
          <td class="sla" style="background:${TONE_BG[row.tone]};color:${TONE_TEXT[row.tone]};font-weight:700;">${escapeHtml(row.slaDaysLabel)}</td>
          <td>${escapeHtml(row.planName)}</td>
        </tr>`;
          })
          .join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Pedidos ${escapeHtml(input.cycleLabel)} — DungeonBox</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 16mm 18mm;
    }
    * { box-sizing: border-box; }
    html {
      background: #fafaf9;
    }
    body {
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      font-size: 10pt;
      color: #1c1917;
      margin: 0;
      padding: 20px 24px 28px;
      background: #fff;
      max-width: 297mm;
      min-height: 210mm;
      margin-left: auto;
      margin-right: auto;
    }
    .sheet {
      width: 100%;
    }
    header { margin-bottom: 12px; border-bottom: 2px solid #292524; padding-bottom: 8px; }
    h1 {
      font-size: 16pt;
      margin: 0 0 4px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .meta { font-size: 9pt; color: #57534e; margin: 0; }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 16px;
      margin: 10px 0 14px;
      font-size: 8.5pt;
    }
    .legend span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .swatch {
      width: 14px;
      height: 14px;
      border: 1px solid #a8a29e;
      border-radius: 2px;
      flex-shrink: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid #d6d3d1;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f5f5f4;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    td.email { font-size: 9pt; word-break: break-all; }
    td.num { white-space: nowrap; }
    td.sla { text-align: center; font-size: 9pt; }
    td.stage { white-space: nowrap; font-size: 9pt; text-align: center; }
    td.empty { text-align: center; color: #78716c; padding: 24px; }
    footer {
      margin-top: 12px;
      font-size: 8pt;
      color: #78716c;
    }
    @media print {
      html { background: #fff; }
      body {
        margin: 0;
        /* Fallback quando o diálogo usa “margens mínimas/nenhuma” ou ignora @page */
        padding: 14mm 16mm;
        max-width: none;
        min-height: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <main class="sheet">
  <header>
    <h1>Pedidos por ciclo — ${escapeHtml(input.cycleLabel)}</h1>
    <p class="meta">Gerado em ${escapeHtml(generatedLabel)} · Prazo de produção: ${PRODUCTION_LEAD_BUSINESS_DAYS} dias úteis após o pagamento · Ordenado por atraso (maior primeiro)</p>
  </header>
  <div class="legend">
    <span><i class="swatch" style="background:#dc2626"></i> Mais de 8 dias úteis atrasado</span>
    <span><i class="swatch" style="background:#fecaca"></i> Atrasado até 8 dias úteis</span>
    <span><i class="swatch" style="background:#fef08a"></i> Próximo do limite (&lt; 5 dias úteis restantes)</span>
    <span><i class="swatch" style="background:#bbf7d0"></i> 5+ dias úteis antes do limite</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Cliente</th>
        <th>E-mail</th>
        <th>Etapa</th>
        <th>Data da compra</th>
        <th>Prazo / atraso</th>
        <th>Plano</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
  <footer>${input.rows.length} pedido(s) listado(s). Excluídos: aguardando coleta, enviados e entregues.</footer>
  </main>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
}
