import type { AdminSaleRow, AdminSaleTableGroup } from '@/lib/admin/sales-types';

function saleTime(row: AdminSaleRow): string {
  return row.paid_at ?? row.created_at ?? '';
}

function compareSalesForGrouping(a: AdminSaleRow, b: AdminSaleRow): number {
  if (a.countsInRevenue !== b.countsInRevenue) {
    return a.countsInRevenue ? -1 : 1;
  }

  const cmp = saleTime(a).localeCompare(saleTime(b));
  if (cmp !== 0) return cmp;
  return a.id.localeCompare(b.id);
}

export function groupAdminSalesRows(sales: AdminSaleRow[]): AdminSaleTableGroup[] {
  const bySubscription = new Map<string, AdminSaleRow[]>();
  const standalone: AdminSaleRow[] = [];

  for (const sale of sales) {
    if (sale.subscriptionId) {
      const list = bySubscription.get(sale.subscriptionId) ?? [];
      list.push(sale);
      bySubscription.set(sale.subscriptionId, list);
      continue;
    }

    standalone.push(sale);
  }

  const groups: AdminSaleTableGroup[] = standalone.map((sale) => ({
    id: sale.id,
    main: sale,
    installments: [],
  }));

  for (const [subscriptionId, rows] of Array.from(bySubscription.entries())) {
    const sorted = [...rows].sort(compareSalesForGrouping);
    const main = sorted[0]!;
    const installments = sorted.slice(1);

    groups.push({
      id: subscriptionId,
      main,
      installments,
    });
  }

  return groups.sort((a, b) => saleTime(b.main).localeCompare(saleTime(a.main)));
}
