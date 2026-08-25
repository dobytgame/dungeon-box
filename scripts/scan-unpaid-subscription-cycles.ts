import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createAdminClient } from '../lib/supabase/admin';
import {
  isExtraStoreKitPayment,
  isStoreOrderBillingPayment,
  prepareBillingCyclePayments,
  type BillingPaymentRow,
} from '../lib/subscriptions/billing-cycle-payments';
import { repairMonthlyProductionForSubscription } from '../lib/subscriptions/monthly-production-schedule';

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), '.env.local'));
loadEnvFile(resolve(process.cwd(), '.env'));

type PaymentRow = BillingPaymentRow & {
  subscription_id: string;
  status: string;
};

type CycleRow = {
  subscription_id: string;
  cycle_number: number;
  status: string;
  payment_id: string | null;
  paid_at: string | null;
};

type SubRow = {
  id: string;
  status: string;
  billing_term: string | null;
  current_cycle: number | null;
  next_billing_date: string | null;
  pagarme_subscription_id: string | null;
  asaas_subscription_id: string | null;
  user_id: string;
};

async function fetchAll<T>(
  loader: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await loader(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

function brDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

async function main() {
  const applyRepair = process.argv.includes('--repair');
  const admin = createAdminClient();

  const subs = (
    await fetchAll<SubRow>((from, to) =>
      admin
        .from('subscriptions')
        .select(
          'id, status, billing_term, current_cycle, next_billing_date, pagarme_subscription_id, asaas_subscription_id, user_id'
        )
        .in('status', ['active', 'past_due'])
        .or('billing_term.eq.monthly,billing_term.is.null')
        .range(from, to)
    )
  ).filter((row) => (row.billing_term ?? 'monthly') === 'monthly');

  const userIds = Array.from(new Set(subs.map((row) => row.user_id)));
  const profiles: Array<{
    id: string;
    email: string | null;
    full_name: string | null;
  }> = [];
  for (let i = 0; i < userIds.length; i += 200) {
    const chunk = userIds.slice(i, i + 200);
    const { data, error } = await admin
      .from('profiles')
      .select('id, email, full_name')
      .in('id', chunk);
    if (error) throw new Error(error.message);
    profiles.push(...(data ?? []));
  }
  const profileById = new Map(profiles.map((row) => [row.id, row]));

  const payments = await fetchAll<PaymentRow>((from, to) =>
    admin
      .from('payments')
      .select(
        'id, subscription_id, amount_cents, paid_at, created_at, status_detail, status'
      )
      .eq('status', 'approved')
      .not('subscription_id', 'is', null)
      .range(from, to)
  );

  const cycles = await fetchAll<CycleRow>((from, to) =>
    admin
      .from('subscription_cycles')
      .select('subscription_id, cycle_number, status, payment_id, paid_at')
      .range(from, to)
  );

  const paymentsBySub = new Map<string, PaymentRow[]>();
  for (const payment of payments) {
    const list = paymentsBySub.get(payment.subscription_id) ?? [];
    list.push(payment);
    paymentsBySub.set(payment.subscription_id, list);
  }

  const cyclesBySub = new Map<string, CycleRow[]>();
  for (const cycle of cycles) {
    const list = cyclesBySub.get(cycle.subscription_id) ?? [];
    list.push(cycle);
    cyclesBySub.set(cycle.subscription_id, list);
  }

  const findings: Array<Record<string, unknown>> = [];

  for (const sub of subs) {
    const subPayments = paymentsBySub.get(sub.id) ?? [];
    const subCycles = [...(cyclesBySub.get(sub.id) ?? [])].sort(
      (a, b) => a.cycle_number - b.cycle_number
    );
    const storePayments = subPayments.filter((payment) =>
      isStoreOrderBillingPayment(payment)
    );
    const billingPayments = prepareBillingCyclePayments(subPayments);
    const billingPaymentIds = new Set(billingPayments.map((payment) => payment.id));
    const maxBillingCycle = subCycles.reduce((max, cycle) => {
      if (!cycle.payment_id || !billingPaymentIds.has(cycle.payment_id)) {
        return max;
      }
      return Math.max(max, cycle.cycle_number);
    }, 0);
    const expectedCurrentCycle = Math.max(
      1,
      billingPayments.length,
      maxBillingCycle
    );
    const currentCycle = sub.current_cycle ?? 1;
    const maxCycleNumber = subCycles.reduce(
      (max, cycle) => Math.max(max, cycle.cycle_number),
      0
    );
    const cycle3 = subCycles.find((cycle) => cycle.cycle_number === 3);
    const cycle4 = subCycles.find((cycle) => cycle.cycle_number === 4);
    const earliestId = billingPayments[0]?.id ?? subPayments[0]?.id;
    const extraLinkedCycles = subCycles
      .filter((cycle) => {
        if (!cycle.payment_id) return false;
        const payment = subPayments.find((row) => row.id === cycle.payment_id);
        if (!payment) return false;
        return isExtraStoreKitPayment(payment, earliestId);
      })
      .map((cycle) => cycle.cycle_number);
    const extraOnUpcoming = subCycles.filter(
      (cycle) =>
        extraLinkedCycles.includes(cycle.cycle_number) &&
        cycle.status === 'upcoming'
    );
    const cycle3IsStore = extraOnUpcoming.some(
      (cycle) => cycle.cycle_number === 3
    );
    const unpaidPlaceholderCycles = subCycles.filter(
      (cycle) =>
        cycle.cycle_number > expectedCurrentCycle &&
        cycle.status === 'upcoming' &&
        !cycle.payment_id
    );
    const cycle4Unpaid =
      Boolean(cycle4) && !cycle4?.payment_id && !cycle4?.paid_at;

    const inflatedCurrentCycle = currentCycle > expectedCurrentCycle;
    const extraUnpaidCycle = unpaidPlaceholderCycles.length > 0 || cycle4Unpaid;
    const needsRepair =
      inflatedCurrentCycle || extraUnpaidCycle || extraOnUpcoming.length > 0;

    if (!needsRepair) continue;

    const profile = profileById.get(sub.user_id);
    findings.push({
      subscriptionId: sub.id,
      name: profile?.full_name ?? '—',
      email: profile?.email ?? '—',
      status: sub.status,
      currentCycle,
      expectedCurrentCycle,
      billingPayments: billingPayments.length,
      approvedPayments: subPayments.length,
      storeKits: storePayments.length,
      extraLinkedCycles,
      extraOnUpcoming: extraOnUpcoming.map((cycle) => cycle.cycle_number),
      cycle3IsStore,
      cycle3Status: cycle3?.status ?? null,
      cycle4Unpaid,
      maxCycleNumber,
      nextBilling: brDate(sub.next_billing_date),
      gateway: sub.pagarme_subscription_id
        ? 'pagarme'
        : sub.asaas_subscription_id
          ? 'asaas'
          : 'none',
      unpaidPlaceholders: unpaidPlaceholderCycles.map(
        (cycle) => cycle.cycle_number
      ),
    });
  }

  findings.sort((a, b) => {
    const storeDiff =
      Number(Boolean((b.storeKits as number) > 0)) -
      Number(Boolean((a.storeKits as number) > 0));
    if (storeDiff !== 0) return storeDiff;
    return (b.currentCycle as number) - (a.currentCycle as number);
  });

  const summary = {
    scanned: subs.length,
    affected: findings.length,
    cycle4Unpaid: findings.filter((row) => row.cycle4Unpaid).length,
    storeKitLinked: findings.filter(
      (row) => (row.extraOnUpcoming as number[]).length > 0
    ).length,
    inflatedCurrentCycle: findings.filter(
      (row) => (row.currentCycle as number) > (row.expectedCurrentCycle as number)
    ).length,
    applyRepair,
  };

  let repairs: Array<Record<string, unknown>> = [];
  if (applyRepair) {
    for (const finding of findings) {
      const result = await repairMonthlyProductionForSubscription(
        admin,
        finding.subscriptionId as string
      );
      repairs.push({
        subscriptionId: finding.subscriptionId,
        name: finding.name,
        before: finding.currentCycle,
        expected: finding.expectedCurrentCycle,
        ...result,
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        summary,
        findings,
        repairs,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
