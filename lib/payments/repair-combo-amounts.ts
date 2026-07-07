import type { SupabaseClient } from '@supabase/supabase-js';
import { parseComboPaymentDetail, isComboInstallmentSlicePayment } from '@/lib/payments/effective-amount';
import { filterComboPrepaidPayments, listApprovedComboPrepaidPayments } from '@/lib/payments/combo-payment-queries';

/** Corrige pagamentos de combo gravados com valor da 1ª parcela do Asaas. */
export async function repairComboPaymentAmounts(
  admin: SupabaseClient
): Promise<{ scanned: number; updated: number }> {
  const { data, error } = await admin
    .from('payments')
    .select(
      `
      id,
      amount_cents,
      status_detail,
      installments,
      subscriptions(combo_total_cents, combo_installments, billing_term)
    `
    )
    .eq('status', 'approved');

  if (error) {
    console.error('[payments] repairComboPaymentAmounts:', error.message);
    return { scanned: 0, updated: 0 };
  }

  const payments = filterComboPrepaidPayments(data ?? []);

  let updated = 0;

  for (const payment of payments) {
    const comboDetail = parseComboPaymentDetail(payment.status_detail as string);
    if (!comboDetail) continue;

    const subscription = Array.isArray(payment.subscriptions)
      ? payment.subscriptions[0]
      : payment.subscriptions;
    const comboTotal = subscription?.combo_total_cents as number | null | undefined;
    if (!comboTotal || comboTotal <= (payment.amount_cents as number)) continue;

    const installments =
      (subscription?.combo_installments as number | null | undefined) ??
      (payment.installments as number | null) ??
      1;

    const { error: updateError } = await admin
      .from('payments')
      .update({
        amount_cents: comboTotal,
        installments,
        status_detail: JSON.stringify({
          ...comboDetail,
          combo_total_cents: comboTotal,
          combo_installments: installments > 1 ? installments : undefined,
        }),
      })
      .eq('id', payment.id as string);

    if (!updateError) updated += 1;
  }

  return { scanned: payments?.length ?? 0, updated };
}

/** Rebaixa combo_prepaid duplicados na mesma assinatura (mantém o mais antigo). */
export async function dedupeComboPrepaidPayments(
  admin: SupabaseClient
): Promise<{ scanned: number; updated: number }> {
  const payments = await listApprovedComboPrepaidPayments(admin);

  if (!payments.length) {
    return { scanned: 0, updated: 0 };
  }

  const bySubscription = new Map<string, typeof payments>();
  for (const payment of payments) {
    const subscriptionId = payment.subscription_id as string;
    const list = bySubscription.get(subscriptionId) ?? [];
    list.push(payment);
    bySubscription.set(subscriptionId, list);
  }

  let updated = 0;

  for (const rows of Array.from(bySubscription.values())) {
    if (rows.length <= 1) continue;

    const sorted = [...rows].sort((a, b) => {
      const aTime = (a.paid_at as string | null) ?? (a.created_at as string | null) ?? '';
      const bTime = (b.paid_at as string | null) ?? (b.created_at as string | null) ?? '';
      const cmp = aTime.localeCompare(bTime);
      if (cmp !== 0) return cmp;
      return String(a.id).localeCompare(String(b.id));
    });

    for (const payment of sorted.slice(1)) {
      const { error: updateError } = await admin
        .from('payments')
        .update({
          status_detail: JSON.stringify({
            type: 'combo_installment_slice',
            demoted_duplicate_combo_prepaid: true,
          }),
        })
        .eq('id', payment.id as string);

      if (!updateError) updated += 1;
    }
  }

  return { scanned: payments.length, updated };
}

/** Marca parcelas do combo importadas em duplicata para não entrarem na receita. */
export async function annotateComboInstallmentSlicePayments(
  admin: SupabaseClient
): Promise<{ scanned: number; updated: number }> {
  const { data: payments, error } = await admin
    .from('payments')
    .select(
      `
      id,
      amount_cents,
      status_detail,
      installments,
      subscriptions(billing_term, combo_total_cents, combo_installments)
    `
    )
    .eq('status', 'approved');

  if (error) {
    console.error('[payments] annotateComboInstallmentSlicePayments:', error.message);
    return { scanned: 0, updated: 0 };
  }

  let updated = 0;

  for (const payment of payments ?? []) {
    const subscription = Array.isArray(payment.subscriptions)
      ? payment.subscriptions[0]
      : payment.subscriptions;

    const paymentData = {
      amount_cents: payment.amount_cents as number,
      status_detail: payment.status_detail as string | null,
      installments: payment.installments as number | null,
    };

    if (
      !isComboInstallmentSlicePayment(
        paymentData,
        subscription as {
          billing_term?: string | null;
          combo_total_cents?: number | null;
          combo_installments?: number | null;
        } | null
      )
    ) {
      continue;
    }

    let detail: Record<string, unknown> = { type: 'combo_installment_slice' };
    try {
      const parsed = payment.status_detail
        ? (JSON.parse(payment.status_detail as string) as Record<string, unknown>)
        : {};
      detail = { ...parsed, type: 'combo_installment_slice' };
    } catch {
      // keep default detail
    }

    const { error: updateError } = await admin
      .from('payments')
      .update({ status_detail: JSON.stringify(detail) })
      .eq('id', payment.id as string);

    if (!updateError) updated += 1;
  }

  return { scanned: payments?.length ?? 0, updated };
}
