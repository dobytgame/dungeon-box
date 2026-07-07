import type { SupabaseClient } from '@supabase/supabase-js';
import { isComboPrepaidPayment } from '@/lib/payments/effective-amount';

type ComboPrepaidRow = {
  id: string;
  asaas_payment_id?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  status_detail?: string | null;
  subscription_id?: string | null;
  amount_cents?: number;
};

function sortComboPrepaidRows<T extends ComboPrepaidRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aTime = a.paid_at ?? a.created_at ?? '';
    const bTime = b.paid_at ?? b.created_at ?? '';
    const cmp = aTime.localeCompare(bTime);
    if (cmp !== 0) return cmp;
    return a.id.localeCompare(b.id);
  });
}

export function filterComboPrepaidPayments<T extends ComboPrepaidRow>(rows: T[]): T[] {
  return rows.filter((row) => isComboPrepaidPayment(row.status_detail));
}

/** Primeiro combo_prepaid aprovado de uma assinatura (canônico). */
export async function findCanonicalComboPrepaidPayment(
  admin: SupabaseClient,
  subscriptionId: string
): Promise<ComboPrepaidRow | null> {
  const { data, error } = await admin
    .from('payments')
    .select('id, asaas_payment_id, paid_at, created_at, status_detail, amount_cents')
    .eq('subscription_id', subscriptionId)
    .eq('status', 'approved');

  if (error || !data?.length) return null;

  const comboRows = sortComboPrepaidRows(filterComboPrepaidPayments(data));
  return comboRows[0] ?? null;
}

export async function listApprovedComboPrepaidPayments(
  admin: SupabaseClient
): Promise<ComboPrepaidRow[]> {
  const { data, error } = await admin
    .from('payments')
    .select('id, subscription_id, paid_at, created_at, status_detail, amount_cents')
    .eq('status', 'approved')
    .not('subscription_id', 'is', null);

  if (error || !data?.length) return [];

  return filterComboPrepaidPayments(data);
}
