import type { PaymentStatus } from '@/lib/dashboard/types';

export type AdminSaleType =
  | 'assinatura'
  | 'loja_avulsa'
  | 'loja_bundled'
  | 'outro';

export interface AdminSaleRow {
  id: string;
  userId: string;
  saleType: AdminSaleType;
  saleTypeLabel: string;
  customerName: string | null;
  customerEmail: string | null;
  description: string;
  amount_cents: number;
  effectiveAmountCents: number;
  installmentCount: number | null;
  comboLabel: string | null;
  status: PaymentStatus;
  payment_method: string | null;
  paid_at: string | null;
  created_at: string | null;
  subscriptionId: string | null;
  planName: string | null;
  asaasPaymentId: string | null;
  isComboInstallmentSlice: boolean;
  countsInRevenue: boolean;
  countsInSales: boolean;
}

export interface AdminSalesListFilters {
  q?: string;
  status?: string;
  saleType?: AdminSaleType;
  from: string;
  to: string;
  periodLabel: string;
  limit?: number;
  page?: number;
  pageSize?: number;
  sort?: AdminSalesSortField;
  order?: 'asc' | 'desc';
}

export type AdminSalesSortField =
  | 'paid_at'
  | 'created_at'
  | 'amount'
  | 'customer';

export interface AdminSalesPageSummary {
  periodLabel: string;
  from: string;
  to: string;
  filteredCount: number;
  visibleCount: number;
  hiddenInstallmentCount: number;
  approvedCount: number;
  pendingCount: number;
  revenueCents: number;
  byType: Record<AdminSaleType, { count: number; revenueCents: number }>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AdminSaleTableGroup {
  id: string;
  main: AdminSaleRow;
  installments: AdminSaleRow[];
}
