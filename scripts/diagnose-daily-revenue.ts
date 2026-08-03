import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createAdminClient } from '../lib/supabase/admin';
import {
  brazilDateToEndIso,
  brazilDateToStartIso,
  toBrazilDateKey,
} from '../lib/datetime/brazil';
import {
  loadRevenueCountIndexes,
  resolvePaymentRevenueCents,
  shouldCountInAdminSales,
  shouldCountPaymentInRevenue,
} from '../lib/payments/revenue-aggregation';
import { classifyAdminSale } from '../lib/admin/sales';

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

const day = process.argv[2] ?? '2026-08-03';

async function main() {
  const admin = createAdminClient();
  const start = brazilDateToStartIso(day);
  const end = brazilDateToEndIso(day);

  const { data, error } = await admin
    .from('payments')
    .select(
      `
      id,
      amount_cents,
      status,
      paid_at,
      created_at,
      subscription_id,
      asaas_payment_id,
      pagarme_charge_id,
      payment_method,
      status_detail,
      subscriptions(
        billing_term,
        combo_total_cents,
        combo_installments,
        prepaid_months,
        prepaid_until,
        started_at,
        plans!plan_id(name)
      )
    `
    )
    .eq('status', 'approved')
    .gte('paid_at', start)
    .lte('paid_at', end)
    .order('paid_at');

  if (error) throw error;

  const rows = data ?? [];
  const indexes = await loadRevenueCountIndexes(admin, day);

  let totalRaw = 0;
  let inRevenue = 0;
  let inSales = 0;
  let renewal = 0;
  let assinatura = 0;
  let loja = 0;
  const byGateway = { asaas: 0, pagarme: 0, other: 0 };
  const byGatewayRevenue = { asaas: 0, pagarme: 0, other: 0 };
  const lines: string[] = [];

  for (const row of rows) {
    totalRaw += row.amount_cents;
    const gw = row.asaas_payment_id
      ? 'asaas'
      : row.pagarme_charge_id
        ? 'pagarme'
        : 'other';
    byGateway[gw] += row.amount_cents;

    const rev = shouldCountPaymentInRevenue(
      row,
      indexes.canonicalComboBySubscription,
      indexes.comboPrepaidDayBySubscription,
      indexes.canonicalMonthlyBySubscriptionMonth,
      indexes.firstPaymentBySubscription
    );
    const sale = shouldCountInAdminSales(row, indexes);
    const eff = resolvePaymentRevenueCents(row);
    const brazilDay = toBrazilDateKey(
      (row.paid_at as string | null) ?? (row.created_at as string | null) ?? ''
    );

    if (rev) {
      inRevenue += eff;
      byGatewayRevenue[gw] += eff;
    }
    if (sale) {
      inSales += eff;
      const subscription = Array.isArray(row.subscriptions)
        ? row.subscriptions[0]
        : row.subscriptions;
      const plan = subscription?.plans
        ? Array.isArray(subscription.plans)
          ? subscription.plans[0]
          : subscription.plans
        : null;
      const { saleType } = classifyAdminSale({
        subscription_id: row.subscription_id as string | null,
        status_detail: row.status_detail as string | null,
        planName: (plan?.name as string | null) ?? null,
        billingTerm: (subscription as { billing_term?: string | null } | null)
          ?.billing_term,
      });
      if (saleType === 'assinatura') assinatura += eff;
      else loja += eff;
    }
    if (rev && row.subscription_id && !sale) renewal += eff;

    lines.push(
      [
        row.id.slice(0, 8),
        gw,
        `R$ ${(row.amount_cents / 100).toFixed(2)}`,
        `eff R$ ${(eff / 100).toFixed(2)}`,
        rev ? 'REV' : 'skip',
        sale ? 'SALE' : row.subscription_id ? 'RENEW' : '-',
        brazilDay,
        (row.paid_at as string)?.slice(0, 19) ?? '-',
      ].join(' | ')
    );
  }

  console.log(`\n=== Pagamentos aprovados (paid_at BRT ${day}) ===`);
  console.log('Linhas:', rows.length);
  console.log('Soma bruta:', (totalRaw / 100).toFixed(2));
  console.log(
    'Por gateway (bruto):',
    Object.entries(byGateway)
      .map(([k, v]) => `${k}=R$ ${(v / 100).toFixed(2)}`)
      .join(', ')
  );
  console.log(
    'Por gateway (receita efetiva):',
    Object.entries(byGatewayRevenue)
      .map(([k, v]) => `${k}=R$ ${(v / 100).toFixed(2)}`)
      .join(', ')
  );
  console.log('Receita dashboard:', (inRevenue / 100).toFixed(2));
  console.log('  vendas novas:', (inSales / 100).toFixed(2));
  console.log('    assinatura:', (assinatura / 100).toFixed(2));
  console.log('    loja:', (loja / 100).toFixed(2));
  console.log('  renovações:', (renewal / 100).toFixed(2));
  console.log('\nDetalhe:');
  for (const line of lines) console.log(' ', line);

  const { data: pagarmeAll } = await admin
    .from('payments')
    .select('id, amount_cents, paid_at, pagarme_charge_id, subscription_id')
    .eq('status', 'approved')
    .not('pagarme_charge_id', 'is', null)
    .gte('paid_at', start)
    .lte('paid_at', end);

  const { data: missingDay } = await admin
    .from('payments')
    .select('id, amount_cents, paid_at, pagarme_charge_id, asaas_payment_id')
    .eq('status', 'approved')
    .gte('paid_at', brazilDateToStartIso('2026-08-01'))
    .lte('paid_at', brazilDateToEndIso('2026-08-05'));

  const wrongDay = (missingDay ?? []).filter(
    (r) =>
      toBrazilDateKey((r.paid_at as string) ?? '') === day &&
      ((r.paid_at as string) < start || (r.paid_at as string) > end)
  );

  console.log(`\nPagarme no dia (query paid_at): ${pagarmeAll?.length ?? 0}`);
  console.log(`Pagamentos com dia BRT ${day} mas paid_at fora da janela: ${wrongDay.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
