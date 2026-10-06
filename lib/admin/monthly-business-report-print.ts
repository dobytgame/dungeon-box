import type { MonthlyBusinessReport } from '@/lib/admin/monthly-business-report';
import { formatMoney } from '@/lib/dashboard/format';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function money(cents: number): string {
  return escapeHtml(formatMoney(cents));
}

export function renderMonthlyBusinessReportHtml(
  report: MonthlyBusinessReport
): string {
  const rows = report.rows
    .map(
      (row) => `
    <tr>
      <td>${escapeHtml(row.monthLabel)}</td>
      <td class="num">${money(row.totalRevenueCents)}</td>
      <td class="num">${row.newSalesCount}</td>
      <td class="num">${money(row.newSalesRevenueCents)}</td>
      <td class="num">${row.subscriptionNewCount} · ${money(row.subscriptionNewRevenueCents)}</td>
      <td class="num">${row.storeNewCount} · ${money(row.storeNewRevenueCents)}</td>
      <td class="num">${row.renewalCount} · ${money(row.renewalRevenueCents)}</td>
      <td class="num">${row.newCustomersCount}</td>
      <td class="num">${row.activeSubscribersEnd}</td>
    </tr>`
    )
    .join('');

  const t = report.totals;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Relatório mensal — DungeonBox</title>
  <style>
    @page { size: A4 landscape; margin: 16mm 18mm; }
    body { font-family: system-ui, sans-serif; font-size: 9pt; color: #1c1917; margin: 0; padding: 14mm 16mm; }
    h1 { font-size: 14pt; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.06em; }
    .meta { color: #57534e; font-size: 8.5pt; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #d6d3d1; padding: 5px 6px; text-align: left; vertical-align: top; }
    th { background: #f5f5f4; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.06em; }
    td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    tfoot td { font-weight: 700; background: #fafaf9; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <h1>Relatório mensal — vendas e assinantes</h1>
  <p class="meta">Período ${escapeHtml(report.from)} a ${escapeHtml(report.to)} · ${report.paymentsAnalyzed} pagamentos analisados</p>
  <table>
    <thead>
      <tr>
        <th>Mês</th>
        <th>Receita total</th>
        <th>Vendas novas (qtd)</th>
        <th>Vendas novas (R$)</th>
        <th>Assinatura nova</th>
        <th>Loja nova</th>
        <th>Renovações</th>
        <th>Novos clientes</th>
        <th>Assinantes (fim)</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td>Total / último mês</td>
        <td class="num">${money(t.totalRevenueCents)}</td>
        <td class="num">${t.newSalesCount}</td>
        <td class="num">${money(t.newSalesRevenueCents)}</td>
        <td class="num">${t.subscriptionNewCount} · ${money(t.subscriptionNewRevenueCents)}</td>
        <td class="num">${t.storeNewCount} · ${money(t.storeNewRevenueCents)}</td>
        <td class="num">${t.renewalCount} · ${money(t.renewalRevenueCents)}</td>
        <td class="num">${t.newCustomersCount}</td>
        <td class="num">${t.activeSubscribersEnd}</td>
      </tr>
    </tfoot>
  </table>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
}
