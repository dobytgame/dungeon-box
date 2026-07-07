import type { SupabaseClient } from '@supabase/supabase-js';
import { importAsaasPaymentsForSubscription } from '@/lib/asaas/import-payments';
import {
  annotateComboInstallmentSlicePayments,
  dedupeComboPrepaidPayments,
  repairComboPaymentAmounts,
} from '@/lib/payments/repair-combo-amounts';

const FUTURE_CHARGE_ASAAS_IDS = [
  'pay_86592kkfm8g9g8o1',
  'pay_6gpdqhutjaunlthk',
  'pay_fa19uvuoo89pkba0',
  'pay_su8syhnjradyiag9',
  'pay_dzkum55nnubbbqrb',
] as const;

const LORDSETH_SUBSCRIPTION_ID = '431aff2c-a4ac-4b65-9ead-3144bfe7ad68';
const LORDSETH_REPAIR_PAYMENT_ID = '431aff2c-a4ac-4b65-9ead-3144bfe7ad01';

export type RepairAsaasIncoherenciesResult = {
  comboDuplicateRowsFixed: number;
  comboPrepaidDeduped: number;
  comboAmountsFixed: number;
  installmentSlicesAnnotated: number;
  futureChargesCancelled: number;
  lordsethComboInserted: boolean;
  lordsethCycleLinked: boolean;
  lordsethAsaasImported: number;
};

async function applyKnownComboDuplicateFixes(
  admin: SupabaseClient
): Promise<number> {
  let fixed = 0;

  const pedroDemotes = [
    { id: '94998779-dd39-4614-b8d1-13a921fcf82f', amount_cents: 14775 },
    { id: 'bad4c176-ebd2-44ad-ac10-963c8ba5f8c4', amount_cents: 14775 },
    { id: '8fb5e3eb-28fc-4a38-b495-cf1d9f3344db', amount_cents: 14778 },
  ];

  for (const row of pedroDemotes) {
    const { data } = await admin
      .from('payments')
      .update({
        amount_cents: row.amount_cents,
        status_detail: JSON.stringify({
          type: 'combo_installment_slice',
          imported_from_asaas: true,
        }),
      })
      .eq('id', row.id)
      .eq('subscription_id', 'a02caf7f-2736-4683-a745-701f0f8a6628')
      .ilike('status_detail', '%combo_prepaid%')
      .select('id');
    fixed += data?.length ?? 0;
  }

  const { data: pedroCanonical } = await admin
    .from('payments')
    .update({
      status_detail: JSON.stringify({
        type: 'combo_prepaid',
        billing_term: 'combo_3',
        combo_total_cents: 59103,
        combo_installments: 4,
        imported_from_asaas: true,
      }),
    })
    .eq('id', 'c95b4636-ee98-4938-a060-5ccd3f7831e8')
    .select('id');
  fixed += pedroCanonical?.length ?? 0;

  const victorSlices = [
    'e223f8a3-8db1-4006-9eb6-87821dedab1b',
    'e7477b0a-38ea-439a-813c-0a0027f3e4f8',
    '06b3f0b4-017e-4930-a52c-52533fc96507',
  ];
  for (const id of victorSlices) {
    const { data } = await admin
      .from('payments')
      .update({
        status_detail: JSON.stringify({
          type: 'combo_installment_slice',
          imported_from_asaas: true,
        }),
      })
      .eq('id', id)
      .eq('subscription_id', 'f3fccfa8-42b6-4566-bcae-c7f3df7302b3')
      .select('id');
    fixed += data?.length ?? 0;
  }

  const anaSlices = [
    'ac37f0fc-7e89-4988-ab3e-e480daf49957',
    'c0b38352-9dcd-4a01-bab2-0ab7681e3a49',
    '3d71f909-c0ff-43a9-8bb4-64cb75083071',
  ];
  for (const id of anaSlices) {
    const { data } = await admin
      .from('payments')
      .update({
        status_detail: JSON.stringify({
          type: 'combo_installment_slice',
          imported_from_asaas: true,
        }),
      })
      .eq('id', id)
      .eq('subscription_id', 'e7812ea5-5a75-48bd-9d77-5c4dd4e92aa7')
      .select('id');
    fixed += data?.length ?? 0;
  }

  return fixed;
}

async function cancelFutureChargeImports(
  admin: SupabaseClient
): Promise<number> {
  const { data, error } = await admin
    .from('payments')
    .update({
      status: 'cancelled',
      status_detail: JSON.stringify({
        type: 'cancelled_future_charge',
        repaired_at: new Date().toISOString().slice(0, 10),
      }),
    })
    .in('asaas_payment_id', [...FUTURE_CHARGE_ASAAS_IDS])
    .eq('status', 'pending')
    .select('id');

  if (error) {
    console.error('[payments] cancelFutureChargeImports:', error.message);
    return 0;
  }

  return data?.length ?? 0;
}

async function ensureLordsethComboPayment(
  admin: SupabaseClient
): Promise<{ inserted: boolean; cycleLinked: boolean }> {
  const { data: existing } = await admin
    .from('payments')
    .select('id')
    .eq('subscription_id', LORDSETH_SUBSCRIPTION_ID)
    .eq('status', 'approved')
    .ilike('status_detail', '%combo_prepaid%')
    .limit(1)
    .maybeSingle();

  let paymentId = existing?.id as string | undefined;

  if (!paymentId) {
    const { data: subscription } = await admin
      .from('subscriptions')
      .select('user_id')
      .eq('id', LORDSETH_SUBSCRIPTION_ID)
      .maybeSingle();

    if (!subscription?.user_id) {
      return { inserted: false, cycleLinked: false };
    }

    const { data: inserted, error } = await admin
      .from('payments')
      .insert({
        id: LORDSETH_REPAIR_PAYMENT_ID,
        user_id: subscription.user_id,
        subscription_id: LORDSETH_SUBSCRIPTION_ID,
        asaas_payment_id: 'repair_lordseth_combo_431aff2c',
        amount_cents: 39150,
        currency: 'BRL',
        status: 'approved',
        installments: 4,
        paid_at: '2026-07-07T15:00:00.000Z',
        status_detail: JSON.stringify({
          type: 'combo_prepaid',
          billing_term: 'combo_3',
          combo_total_cents: 39150,
          combo_installments: 4,
          repaired_from_asaas_export: true,
        }),
      })
      .select('id')
      .maybeSingle();

    if (error && !error.message.includes('duplicate')) {
      console.error('[payments] ensureLordsethComboPayment:', error.message);
      return { inserted: false, cycleLinked: false };
    }

    paymentId = (inserted?.id as string | undefined) ?? LORDSETH_REPAIR_PAYMENT_ID;
  }

  const { data: linked } = await admin
    .from('subscription_cycles')
    .update({
      payment_id: paymentId,
      updated_at: new Date().toISOString(),
    })
    .eq('subscription_id', LORDSETH_SUBSCRIPTION_ID)
    .eq('cycle_number', 1)
    .is('payment_id', null)
    .select('id');

  return {
    inserted: !existing?.id,
    cycleLinked: (linked?.length ?? 0) > 0,
  };
}

/** Reparo dos casos identificados na auditoria Asaas × payments. */
export async function repairAsaasPaymentIncoherencies(
  admin: SupabaseClient
): Promise<RepairAsaasIncoherenciesResult> {
  const comboDuplicateRowsFixed = await applyKnownComboDuplicateFixes(admin);
  const comboPrepaidDeduped = (await dedupeComboPrepaidPayments(admin)).updated;
  const comboAmounts = await repairComboPaymentAmounts(admin);
  const futureChargesCancelled = await cancelFutureChargeImports(admin);
  const lordseth = await ensureLordsethComboPayment(admin);

  let lordsethAsaasImported = 0;
  const { data: lordsethSub } = await admin
    .from('subscriptions')
    .select(
      'id, user_id, asaas_subscription_id, asaas_customer_id, billing_term, combo_total_cents, combo_installments'
    )
    .eq('id', LORDSETH_SUBSCRIPTION_ID)
    .maybeSingle();

  if (lordsethSub?.user_id) {
    const importResult = await importAsaasPaymentsForSubscription(admin, {
      id: lordsethSub.id as string,
      user_id: lordsethSub.user_id as string,
      asaas_subscription_id: lordsethSub.asaas_subscription_id as string | null,
      asaas_customer_id: lordsethSub.asaas_customer_id as string | null,
      billing_term: lordsethSub.billing_term as string | null,
      combo_total_cents: lordsethSub.combo_total_cents as number | null,
      combo_installments: lordsethSub.combo_installments as number | null,
    });
    lordsethAsaasImported = importResult.upserted;
  }

  const installmentSlices = await annotateComboInstallmentSlicePayments(admin);

  return {
    comboDuplicateRowsFixed: comboDuplicateRowsFixed + comboPrepaidDeduped,
    comboPrepaidDeduped,
    comboAmountsFixed: comboAmounts.updated,
    installmentSlicesAnnotated: installmentSlices.updated,
    futureChargesCancelled,
    lordsethComboInserted: lordseth.inserted,
    lordsethCycleLinked: lordseth.cycleLinked,
    lordsethAsaasImported,
  };
}
