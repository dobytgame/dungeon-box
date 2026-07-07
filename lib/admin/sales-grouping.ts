import type { AdminSaleRow, AdminSaleTableGroup } from '@/lib/admin/sales-types';

export function groupAdminSalesRows(sales: AdminSaleRow[]): AdminSaleTableGroup[] {
  const bySubscription = new Map<
    string,
    { main: AdminSaleRow | null; installments: AdminSaleRow[] }
  >();
  const standalone: AdminSaleRow[] = [];

  for (const sale of sales) {
    if (sale.isComboInstallmentSlice && sale.subscriptionId) {
      const bucket = bySubscription.get(sale.subscriptionId) ?? {
        main: null,
        installments: [],
      };
      bucket.installments.push(sale);
      bySubscription.set(sale.subscriptionId, bucket);
      continue;
    }

    if (sale.subscriptionId && sale.comboLabel) {
      const bucket = bySubscription.get(sale.subscriptionId) ?? {
        main: null,
        installments: [],
      };
      bucket.main = sale;
      bySubscription.set(sale.subscriptionId, bucket);
      continue;
    }

    standalone.push(sale);
  }

  const groups: AdminSaleTableGroup[] = standalone.map((sale) => ({
    id: sale.id,
    main: sale,
    installments: [],
  }));

  for (const [subscriptionId, bucket] of Array.from(bySubscription.entries())) {
    if (bucket.main) {
      const installments = [...bucket.installments].sort((a, b) => {
        const aTime = a.paid_at ?? a.created_at ?? '';
        const bTime = b.paid_at ?? b.created_at ?? '';
        return aTime.localeCompare(bTime);
      });
      groups.push({
        id: subscriptionId,
        main: bucket.main,
        installments,
      });
      continue;
    }

    for (const installment of bucket.installments) {
      groups.push({ id: installment.id, main: installment, installments: [] });
    }
  }

  return groups.sort((a, b) => {
    const aTime = a.main.paid_at ?? a.main.created_at ?? '';
    const bTime = b.main.paid_at ?? b.main.created_at ?? '';
    return bTime.localeCompare(aTime);
  });
}
