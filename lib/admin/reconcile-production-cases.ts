import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchAsaasPayment } from '@/lib/asaas/one-time-payment';
import { isAsaasPaymentConfirmed } from '@/lib/asaas/payment-status';
import { toAsaasWebhookPayment } from '@/lib/asaas/payment-sync';
import { handleAsaasPaymentConfirmed } from '@/lib/asaas/webhook-handlers';
import { approveStoreOrderPayment } from '@/lib/asaas/store-order-payment';
import { annotateComboInstallmentSlicePayments, dedupeComboPrepaidPayments } from '@/lib/payments/repair-combo-amounts';
import { findCanonicalComboPrepaidPayment } from '@/lib/payments/combo-payment-queries';
import { repairAsaasPaymentIncoherencies } from '@/lib/payments/repair-asaas-incoherencies';
import { backfillMissingCyclePaymentLinks } from '@/lib/subscriptions/cycles';
import { ensurePaidSubscriptionsHaveKanbanCycles } from '@/lib/subscriptions/ensure-kanban-cycles';
import { repairMonthlyProductionMonthsAndLoyalty } from '@/lib/subscriptions/monthly-production-schedule';
import type { CycleStatus } from '@/lib/dashboard/types';

const OPEN_CYCLE_STATUSES: CycleStatus[] = [
  'upcoming',
  'production',
  'preparing',
  'shipped',
];

export type ProductionReconcileResult = {
  prematurePaymentsCleared: number;
  comboPaymentLinksRestored: number;
  cyclePaymentLinksBackfilled: number;
  subscriptionsRestoredActive: number;
  subscriptionsMarkedPending: number;
  asaasPaymentsImported: number;
  storePaymentsSynced: number;
  paymentMetadataFixed: number;
  comboInstallmentSlicesAnnotated: number;
  monthlyProductionMonthsFixed: number;
  monthlyLoyaltyFixed: number;
  monthlyRenewalCyclesAttached: number;
  monthlySpuriousCyclesCleared: number;
  comboSubscriptionsScheduled: number;
  comboCyclesCreated: number;
  kitMonthsPinned: number;
  asaasIncoherenciesRepaired: RepairAsaasIncoherenciesSummary;
};

type RepairAsaasIncoherenciesSummary = {
  comboDuplicateRowsFixed: number;
  comboAmountsFixed: number;
  futureChargesCancelled: number;
  lordsethComboInserted: boolean;
};

export type ProductionReconcileOptions = {
  /** Não rebaixa assinatura ativa para pending (evita sumir do kanban). */
  markSubscriptionsPending?: boolean;
};

/** Remove vínculo de pagamento em ciclos futuros enquanto um ciclo anterior ainda está aberto (somente mensais). */
export async function clearPrematureCyclePaymentLinks(
  supabase: SupabaseClient
): Promise<number> {
  const { data: cycles, error } = await supabase
    .from('subscription_cycles')
    .select(
      'id, subscription_id, cycle_number, status, payment_id, paid_at, subscriptions!inner(billing_term)'
    )
    .in('status', OPEN_CYCLE_STATUSES)
    .not('payment_id', 'is', null);

  if (error || !cycles?.length) return 0;

  const monthlyCycles = cycles.filter((row) => {
    const subscription = Array.isArray(row.subscriptions)
      ? row.subscriptions[0]
      : row.subscriptions;
    const billingTerm = (subscription as { billing_term?: string | null })
      ?.billing_term;
    return billingTerm === 'monthly';
  });

  const bySub = new Map<string, typeof monthlyCycles>();
  for (const row of monthlyCycles) {
    const list = bySub.get(row.subscription_id as string) ?? [];
    list.push(row);
    bySub.set(row.subscription_id as string, list);
  }

  const toClear: string[] = [];

  for (const subRows of Array.from(bySub.values())) {
    const sorted = [...subRows].sort(
      (a, b) => (a.cycle_number as number) - (b.cycle_number as number)
    );

    for (let index = 1; index < sorted.length; index += 1) {
      const later = sorted[index];
      const hasOpenEarlier = sorted
        .slice(0, index)
        .some((earlier) => OPEN_CYCLE_STATUSES.includes(earlier.status as CycleStatus));

      if (hasOpenEarlier && later.status === 'upcoming') {
        toClear.push(later.id as string);
      }
    }
  }

  if (toClear.length === 0) return 0;

  const { error: updateError } = await supabase
    .from('subscription_cycles')
    .update({
      payment_id: null,
      paid_at: null,
      amount_cents: null,
      updated_at: new Date().toISOString(),
    })
    .in('id', toClear);

  if (updateError) {
    console.error('[reconcile] clearPrematureCyclePaymentLinks:', updateError.message);
    return 0;
  }

  return toClear.length;
}

/** Restaura payment_id de referência em ciclos futuros de combo pré-pago. */
export async function restoreComboPrepaidCyclePaymentLinks(
  supabase: SupabaseClient
): Promise<number> {
  const { data: rows, error } = await supabase
    .from('subscription_cycles')
    .select(
      'id, cycle_number, payment_id, paid_at, subscription_id, subscriptions!inner(billing_term)'
    )
    .gt('cycle_number', 1)
    .is('payment_id', null)
    .is('paid_at', null);

  if (error || !rows?.length) return 0;

  const comboCycleIds = rows
    .filter((row) => {
      const subscription = Array.isArray(row.subscriptions)
        ? row.subscriptions[0]
        : row.subscriptions;
      const billingTerm = (subscription as { billing_term?: string | null })
        ?.billing_term;
      return (
        billingTerm === 'combo_3' ||
        billingTerm === 'combo_6' ||
        billingTerm === 'combo_12'
      );
    })
    .map((row) => row.id as string);

  if (comboCycleIds.length === 0) return 0;

  let restored = 0;

  const subscriptionIds = Array.from(
    new Set(
      rows
        .filter((row) => comboCycleIds.includes(row.id as string))
        .map((row) => row.subscription_id as string)
    )
  );

  for (const subscriptionId of subscriptionIds) {
    const comboPayment = await findCanonicalComboPrepaidPayment(supabase, subscriptionId);

    if (!comboPayment?.id) continue;

    const { data: updated, error: updateError } = await supabase
      .from('subscription_cycles')
      .update({
        payment_id: comboPayment.id,
        updated_at: new Date().toISOString(),
      })
      .eq('subscription_id', subscriptionId)
      .gt('cycle_number', 1)
      .is('payment_id', null)
      .is('paid_at', null)
      .select('id');

    if (!updateError) restored += updated?.length ?? 0;
  }

  return restored;
}

/** Reativa assinaturas pending que ainda têm pedido operacional (corrige sync anterior). */
export async function restorePendingSubscriptionsWithOpenCycles(
  supabase: SupabaseClient
): Promise<number> {
  const { data: cycles, error } = await supabase
    .from('subscription_cycles')
    .select('subscription_id')
    .in('status', ['upcoming', 'production', 'preparing', 'shipped']);

  if (error || !cycles?.length) return 0;

  const subscriptionIds = Array.from(
    new Set(cycles.map((row) => row.subscription_id as string))
  );

  let restored = 0;

  for (const subscriptionId of subscriptionIds) {
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
      .eq('status', 'pending');

    if (!updateError) restored += 1;
  }

  return restored;
}

/** Assinatura ativa sem pagamento aprovado → volta para pending (não altera status do ciclo). */
export async function reconcileActiveSubscriptionsWithoutApprovedPayment(
  supabase: SupabaseClient
): Promise<number> {
  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('status', 'active')
    .in('billing_term', ['combo_3', 'combo_6', 'combo_12', 'monthly']);

  if (error || !subs?.length) return 0;

  let updated = 0;

  for (const sub of subs) {
    const subscriptionId = sub.id as string;

    const { count: approvedCount } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('subscription_id', subscriptionId)
      .eq('status', 'approved');

    if ((approvedCount ?? 0) > 0) continue;

    const { count: pendingCount } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('subscription_id', subscriptionId)
      .eq('status', 'pending');

    if ((pendingCount ?? 0) === 0) continue;

    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
      .eq('status', 'active');

    if (!updateError) updated += 1;
  }

  return updated;
}

/** Importa pagamentos confirmados no Asaas que faltam no banco (ex.: webhook perdido). */
export async function importMissingConfirmedAsaasPayments(
  supabase: SupabaseClient,
  asaasPaymentIds: string[]
): Promise<number> {
  let imported = 0;

  for (const asaasPaymentId of asaasPaymentIds) {
    try {
      const remote = await fetchAsaasPayment(asaasPaymentId);
      if (!isAsaasPaymentConfirmed(remote.status)) continue;

      const { data: existing } = await supabase
        .from('payments')
        .select('id, status')
        .eq('asaas_payment_id', asaasPaymentId)
        .maybeSingle();

      if (existing?.status === 'approved') continue;

      const result = await handleAsaasPaymentConfirmed(
        supabase,
        toAsaasWebhookPayment({
          id: remote.id,
          subscription: remote.subscription,
          externalReference: remote.externalReference,
          value: remote.value,
          status: remote.status,
          billingType: remote.billingType,
        })
      );

      if (result === 'processed') imported += 1;
    } catch (error) {
      console.error('[reconcile] import asaas payment:', asaasPaymentId, error);
    }
  }

  return imported;
}

/** Sincroniza pedidos bundled pendentes cujo status no Asaas mudou. */
export async function syncPendingStorePaymentsFromAsaas(
  supabase: SupabaseClient,
  asaasPaymentIds: string[]
): Promise<number> {
  let synced = 0;

  for (const asaasPaymentId of asaasPaymentIds) {
    try {
      const remote = await fetchAsaasPayment(asaasPaymentId);
      if (!isAsaasPaymentConfirmed(remote.status)) continue;

      const result = await approveStoreOrderPayment(supabase, asaasPaymentId, remote);
      if (result === 'processed') synced += 1;
    } catch (error) {
      console.error('[reconcile] sync store payment:', asaasPaymentId, error);
    }
  }

  return synced;
}

const MANUAL_ASAAS_SUBSCRIPTION_LINKS: Array<{
  subscriptionId: string;
  asaasSubscriptionId: string;
}> = [
  {
    subscriptionId: 'b7db6fa0-6d75-48fb-ac4f-ddcc43c1f502',
    asaasSubscriptionId: 'sub_0vqg7m9h715p4iy9',
  },
];

async function applyManualAsaasSubscriptionLinks(
  supabase: SupabaseClient
): Promise<number> {
  let linked = 0;

  for (const link of MANUAL_ASAAS_SUBSCRIPTION_LINKS) {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        asaas_subscription_id: link.asaasSubscriptionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', link.subscriptionId);

    if (!error) linked += 1;
  }

  return linked;
}

/** Metadados em pagamentos órfãos conhecidos (ex.: kit pintura avulso). */
export async function annotateKnownOrphanPayments(
  supabase: SupabaseClient
): Promise<number> {
  const { data: rows } = await supabase
    .from('payments')
    .select('id, amount_cents, status_detail')
    .eq('status', 'approved')
    .is('status_detail', null)
    .eq('amount_cents', 9999);

  if (!rows?.length) return 0;

  let fixed = 0;
  for (const row of rows) {
    const { error } = await supabase
      .from('payments')
      .update({
        status_detail: JSON.stringify({
          type: 'paint_kit_one_time',
          bump: 'profissional',
        }),
      })
      .eq('id', row.id);

    if (!error) fixed += 1;
  }

  return fixed;
}

export async function reconcileProductionDataCases(
  supabase: SupabaseClient,
  options: ProductionReconcileOptions = {}
): Promise<ProductionReconcileResult> {
  await applyManualAsaasSubscriptionLinks(supabase);

  const prematurePaymentsCleared = await clearPrematureCyclePaymentLinks(supabase);
  const comboPaymentLinksRestored =
    await restoreComboPrepaidCyclePaymentLinks(supabase);
  const cyclePaymentLinksBackfilled =
    await backfillMissingCyclePaymentLinks(supabase);
  const subscriptionsRestoredActive =
    await restorePendingSubscriptionsWithOpenCycles(supabase);
  const subscriptionsMarkedPending = options.markSubscriptionsPending
    ? await reconcileActiveSubscriptionsWithoutApprovedPayment(supabase)
    : 0;
  const asaasPaymentsImported = await importMissingConfirmedAsaasPayments(
    supabase,
    ['pay_5c8bf80ppq203x1w']
  );
  const storePaymentsSynced = await syncPendingStorePaymentsFromAsaas(
    supabase,
    ['pay_hwsbalxjklun4jps']
  );
  const paymentMetadataFixed = await annotateKnownOrphanPayments(supabase);
  const comboPrepaidDeduped = (await dedupeComboPrepaidPayments(supabase)).updated;
  const comboInstallmentSlicesAnnotated = (
    await annotateComboInstallmentSlicePayments(supabase)
  ).updated;
  const asaasRepair = await repairAsaasPaymentIncoherencies(supabase);
  const monthlyRepair = await repairMonthlyProductionMonthsAndLoyalty(supabase);
  const kanbanRepair = await ensurePaidSubscriptionsHaveKanbanCycles(supabase);

  return {
    prematurePaymentsCleared,
    comboPaymentLinksRestored,
    cyclePaymentLinksBackfilled,
    subscriptionsRestoredActive,
    subscriptionsMarkedPending,
    asaasPaymentsImported,
    storePaymentsSynced,
    paymentMetadataFixed,
    comboInstallmentSlicesAnnotated,
    monthlyProductionMonthsFixed: monthlyRepair.monthsFixed,
    monthlyLoyaltyFixed: monthlyRepair.loyaltyFixed,
    monthlyRenewalCyclesAttached: monthlyRepair.renewalCyclesAttached,
    monthlySpuriousCyclesCleared: monthlyRepair.spuriousCyclesCleared,
    comboSubscriptionsScheduled: kanbanRepair.comboSubscriptionsScheduled,
    comboCyclesCreated: kanbanRepair.comboCyclesCreated,
    kitMonthsPinned: kanbanRepair.kitMonthsPinned,
    asaasIncoherenciesRepaired: {
      comboDuplicateRowsFixed: asaasRepair.comboDuplicateRowsFixed,
      comboAmountsFixed: asaasRepair.comboAmountsFixed,
      futureChargesCancelled: asaasRepair.futureChargesCancelled,
      lordsethComboInserted: asaasRepair.lordsethComboInserted,
    },
  };
}
