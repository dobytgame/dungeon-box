import type { SupabaseClient } from '@supabase/supabase-js';
import type { BillingTerm } from '@/lib/checkout/combo-billing';
import { isComboTerm } from '@/lib/checkout/combo-billing';
import { getComboTermLabel } from '@/lib/checkout/combo-display';
import { parseStoreOrderMeta } from '@/lib/asaas/store-order-payment';
import {
  buildCanonicalComboPrepaidIndex,
  buildComboPrepaidDayBySubscription,
  resolvePaymentRevenueCents,
  shouldCountPaymentInRevenue,
  type RevenuePaymentRow,
} from '@/lib/payments/revenue-aggregation';
import {
  parseComboPaymentDetail,
  resolveEffectivePaymentAmountCents,
  resolvePaymentInstallments,
  isComboInstallmentSlicePayment,
} from '@/lib/payments/effective-amount';
import type { PaymentStatus } from '@/lib/dashboard/types';

export type AdminSaleType =
  | 'assinatura'
  | 'loja_avulsa'
  | 'loja_bundled'
  | 'outro';

export interface AdminSaleRow {
  id: string;
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
  isComboInstallmentSlice: boolean;
  countsInRevenue: boolean;
}

const SALE_TYPE_LABEL: Record<AdminSaleType, string> = {
  assinatura: 'Assinatura',
  loja_avulsa: 'Loja avulsa',
  loja_bundled: 'Loja + assinatura',
  outro: 'Outro',
};

function describeStoreOrder(meta: ReturnType<typeof parseStoreOrderMeta>): string {
  if (!meta?.items.length) return 'Pedido da loja';
  return meta.items
    .map((line) => (line.quantity > 1 ? `${line.name} ×${line.quantity}` : line.name))
    .join(', ');
}

export function classifyAdminSale(row: {
  subscription_id: string | null;
  status_detail: string | null;
  planName: string | null;
  billingTerm?: string | null;
  isComboInstallmentSlice?: boolean;
}): { saleType: AdminSaleType; description: string } {
  const comboDetail = parseComboPaymentDetail(row.status_detail);
  const storeMeta = parseStoreOrderMeta(row.status_detail);

  if (storeMeta) {
    const description = describeStoreOrder(storeMeta);
    if (
      storeMeta.shippingMode === 'with_subscription' ||
      storeMeta.bundleSubscriptionId ||
      storeMeta.items.some((item) => item.bundleSubscriptionId)
    ) {
      return { saleType: 'loja_bundled', description };
    }
    return { saleType: 'loja_avulsa', description };
  }

  if (row.subscription_id) {
    const billingTerm = (row.billingTerm ?? 'monthly') as BillingTerm;
    if (row.isComboInstallmentSlice) {
      return {
        saleType: 'assinatura',
        description: row.planName
          ? `Parcela do combo — ${row.planName}`
          : 'Parcela do combo',
      };
    }
    if (comboDetail || isComboTerm(billingTerm)) {
      const comboLabel = isComboTerm(billingTerm)
        ? getComboTermLabel(billingTerm)
        : comboDetail?.billing_term && isComboTerm(comboDetail.billing_term)
          ? getComboTermLabel(comboDetail.billing_term)
          : 'Combo';
      return {
        saleType: 'assinatura',
        description: row.planName
          ? `${comboLabel} — ${row.planName}`
          : comboLabel,
      };
    }
    return {
      saleType: 'assinatura',
      description: row.planName ? `Assinatura — ${row.planName}` : 'Assinatura',
    };
  }

  return { saleType: 'outro', description: 'Pagamento' };
}

export async function listAdminSales(
  admin: SupabaseClient,
  filters: { status?: string; limit?: number } = {}
): Promise<AdminSaleRow[]> {
  const limit = filters.limit ?? 200;
  let query = admin
    .from('payments')
    .select(
      `
      id,
      user_id,
      subscription_id,
      amount_cents,
      status,
      status_detail,
      payment_method,
      paid_at,
      created_at,
      installments,
      profiles(full_name, display_name, email),
      subscriptions(
        billing_term,
        combo_total_cents,
        combo_installments,
        plans!plan_id(name)
      )
    `
    )
    .order('paid_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[admin] listAdminSales:', error.message);
    return [];
  }

  const revenueRows = (data ?? []) as RevenuePaymentRow[];
  const canonicalComboBySubscription = buildCanonicalComboPrepaidIndex(revenueRows);
  const comboPrepaidDayBySubscription = buildComboPrepaidDayBySubscription(
    revenueRows,
    canonicalComboBySubscription
  );

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const subscription = Array.isArray(row.subscriptions)
      ? row.subscriptions[0]
      : row.subscriptions;
    const plan = subscription?.plans
      ? Array.isArray(subscription.plans)
        ? subscription.plans[0]
        : subscription.plans
      : null;
    const planName = (plan?.name as string | null) ?? null;
    const subContext = subscription as {
      billing_term?: string | null;
      combo_total_cents?: number | null;
      combo_installments?: number | null;
    } | null;

    const paymentData = {
      amount_cents: row.amount_cents as number,
      status_detail: row.status_detail as string | null,
      installments: row.installments as number | null,
    };
    const isComboInstallmentSlice = isComboInstallmentSlicePayment(
      paymentData,
      subContext
    );
    const effectiveAmountCents = resolveEffectivePaymentAmountCents(
      paymentData,
      subContext
    );
    const installmentCount = resolvePaymentInstallments(paymentData, subContext);
    const billingTerm = (subContext?.billing_term ?? 'monthly') as BillingTerm;
    const comboLabel =
      isComboTerm(billingTerm) && !isComboInstallmentSlice
        ? getComboTermLabel(billingTerm)
        : null;

    const revenueRow = row as unknown as RevenuePaymentRow;
    const countsInRevenue = shouldCountPaymentInRevenue(
      revenueRow,
      canonicalComboBySubscription,
      comboPrepaidDayBySubscription
    );

    const { saleType, description } = classifyAdminSale({
      subscription_id: row.subscription_id as string | null,
      status_detail: row.status_detail as string | null,
      planName,
      billingTerm: subContext?.billing_term,
      isComboInstallmentSlice,
    });

    return {
      id: row.id as string,
      saleType,
      saleTypeLabel: SALE_TYPE_LABEL[saleType],
      customerName: profile?.full_name ?? profile?.display_name ?? null,
      customerEmail: profile?.email ?? null,
      description,
      amount_cents: row.amount_cents as number,
      effectiveAmountCents,
      installmentCount,
      comboLabel,
      status: row.status as PaymentStatus,
      payment_method: (row.payment_method as string | null) ?? null,
      paid_at: (row.paid_at as string | null) ?? null,
      created_at: (row.created_at as string | null) ?? null,
      subscriptionId: (row.subscription_id as string | null) ?? null,
      planName,
      isComboInstallmentSlice,
      countsInRevenue,
    };
  });
}

export async function getAdminSalesSummary(
  admin: SupabaseClient
): Promise<Record<AdminSaleType, { count: number; revenueCents: number }>> {
  const { data, error } = await admin
    .from('payments')
    .select(
      `
      id,
      subscription_id,
      amount_cents,
      status_detail,
      installments,
      paid_at,
      created_at,
      subscriptions(
        billing_term,
        combo_total_cents,
        combo_installments,
        plans!plan_id(name)
      )
    `
    )
    .eq('status', 'approved')
    .order('paid_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(5000);

  const summary: Record<AdminSaleType, { count: number; revenueCents: number }> = {
    assinatura: { count: 0, revenueCents: 0 },
    loja_avulsa: { count: 0, revenueCents: 0 },
    loja_bundled: { count: 0, revenueCents: 0 },
    outro: { count: 0, revenueCents: 0 },
  };

  if (error) {
    console.error('[admin] getAdminSalesSummary:', error.message);
    return summary;
  }

  const rows = (data ?? []) as RevenuePaymentRow[];
  const canonicalComboBySubscription = buildCanonicalComboPrepaidIndex(rows);
  const comboPrepaidDayBySubscription = buildComboPrepaidDayBySubscription(
    rows,
    canonicalComboBySubscription
  );

  for (const row of rows) {
    if (
      !shouldCountPaymentInRevenue(
        row,
        canonicalComboBySubscription,
        comboPrepaidDayBySubscription
      )
    ) {
      continue;
    }

    const subscription = Array.isArray(row.subscriptions)
      ? row.subscriptions[0]
      : row.subscriptions;
    const plan = subscription?.plans
      ? Array.isArray(subscription.plans)
        ? subscription.plans[0]
        : subscription.plans
      : null;

    const subContext = subscription as {
      billing_term?: string | null;
      combo_total_cents?: number | null;
      combo_installments?: number | null;
    } | null;
    const paymentData = {
      amount_cents: row.amount_cents as number,
      status_detail: row.status_detail as string | null,
      installments: row.installments as number | null,
    };
    const isComboInstallmentSlice = isComboInstallmentSlicePayment(
      paymentData,
      subContext
    );

    const { saleType } = classifyAdminSale({
      subscription_id: row.subscription_id,
      status_detail: row.status_detail,
      planName: (plan?.name as string | null) ?? null,
      billingTerm: subContext?.billing_term,
      isComboInstallmentSlice,
    });

    summary[saleType].count += 1;
    summary[saleType].revenueCents += resolvePaymentRevenueCents(row);
  }

  return summary;
}
