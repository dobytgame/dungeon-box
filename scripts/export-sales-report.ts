import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createAdminClient } from '../lib/supabase/admin';
import { toBrazilDateKey } from '../lib/datetime/brazil';
import {
  buildRevenueCountIndexes,
  resolvePaymentRevenueCents,
  shouldCountInAdminSales,
  shouldCountPaymentInRevenue,
  type RevenuePaymentRow,
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

type Admin = ReturnType<typeof createAdminClient>;

async function fetchAll<T>(
  admin: Admin,
  table: string,
  select: string
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await admin
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}

type PaymentRow = RevenuePaymentRow & {
  user_id: string | null;
  status: string;
  payment_method: string | null;
  subscriptions?: {
    billing_term?: string | null;
    plans?: { name?: string | null } | { name?: string | null }[] | null;
  } | null;
};

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  created_at: string | null;
  is_admin: boolean | null;
};

type Subscription = {
  id: string;
  user_id: string;
  status: string;
  billing_term: string | null;
  started_at: string | null;
  cancelled_at: string | null;
  created_at: string | null;
  plans?: { name?: string | null } | { name?: string | null }[] | null;
};

type Address = {
  user_id: string;
  city: string | null;
  state: string | null;
  is_default: boolean | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

const money = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(path: string, header: string[], rows: unknown[][]) {
  const body = [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n');
  writeFileSync(path, `\uFEFF${body}\r\n`, 'utf8');
}

const SALE_TYPE_LABEL: Record<string, string> = {
  assinatura: 'Assinatura (aquisição)',
  renovacao: 'Assinatura (renovação)',
  loja_avulsa: 'Loja avulsa',
  loja_bundled: 'Loja junto com box',
};

type ClientAgg = {
  userId: string;
  orders: number;
  revenueCents: number;
  subscriptionCents: number;
  renewalCents: number;
  storeCents: number;
  acquisitions: number;
  renewals: number;
  storeOrders: number;
  refundedCount: number;
  refundedCents: number;
  failedCount: number;
  first: string | null;
  last: string | null;
  months: Set<string>;
};

async function main() {
  const admin = createAdminClient();

  const [payments, profiles, subscriptions, addresses] = await Promise.all([
    fetchAll<PaymentRow>(
      admin,
      'payments',
      `id, user_id, status, payment_method, amount_cents, status_detail, installments,
       subscription_id, paid_at, created_at,
       subscriptions(billing_term, combo_total_cents, combo_installments, prepaid_months,
         prepaid_until, started_at, plans!plan_id(name))`
    ),
    fetchAll<Profile>(admin, 'profiles', 'id, email, full_name, phone, created_at, is_admin'),
    fetchAll<Subscription>(
      admin,
      'subscriptions',
      'id, user_id, status, billing_term, started_at, cancelled_at, created_at, plans!plan_id(name)'
    ),
    fetchAll<Address>(admin, 'addresses', 'user_id, city, state, is_default'),
  ]);

  const approved = payments.filter((p) => p.status === 'approved');
  const indexes = buildRevenueCountIndexes(approved);

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const addressByUser = new Map<string, Address>();
  for (const a of addresses) {
    const current = addressByUser.get(a.user_id);
    if (!current || (a.is_default && !current.is_default)) addressByUser.set(a.user_id, a);
  }
  const subsByUser = new Map<string, Subscription[]>();
  for (const s of subscriptions) {
    const list = subsByUser.get(s.user_id) ?? [];
    list.push(s);
    subsByUser.set(s.user_id, list);
  }

  const clients = new Map<string, ClientAgg>();
  const getClient = (userId: string): ClientAgg => {
    let agg = clients.get(userId);
    if (!agg) {
      agg = {
        userId,
        orders: 0,
        revenueCents: 0,
        subscriptionCents: 0,
        renewalCents: 0,
        storeCents: 0,
        acquisitions: 0,
        renewals: 0,
        storeOrders: 0,
        refundedCount: 0,
        refundedCents: 0,
        failedCount: 0,
        first: null,
        last: null,
        months: new Set(),
      };
      clients.set(userId, agg);
    }
    return agg;
  };

  type Monthly = {
    orders: number;
    revenue: number;
    acquisitionCents: number;
    acquisitions: number;
    renewalCents: number;
    renewals: number;
    storeCents: number;
    storeOrders: number;
    buyers: Set<string>;
    newBuyers: number;
  };
  const monthly = new Map<string, Monthly>();
  const byPlan = new Map<string, { orders: number; revenue: number; buyers: Set<string> }>();
  const byMethod = new Map<string, { orders: number; revenue: number }>();
  const detailRows: unknown[][] = [];

  const sortedApproved = [...approved].sort((a, b) =>
    (a.paid_at ?? a.created_at ?? '').localeCompare(b.paid_at ?? b.created_at ?? '')
  );

  for (const row of sortedApproved) {
    const counted = shouldCountPaymentInRevenue(
      row,
      indexes.canonicalComboBySubscription,
      indexes.comboPrepaidDayBySubscription,
      indexes.canonicalMonthlyBySubscriptionMonth,
      indexes.firstPaymentBySubscription
    );
    const amount = resolvePaymentRevenueCents(row);
    const when = row.paid_at ?? row.created_at ?? '';
    const day = when ? toBrazilDateKey(when) : '';
    const month = day.slice(0, 7);
    const sub = one(row.subscriptions);
    const planName = one(sub?.plans)?.name ?? null;

    let saleType = 'renovacao';
    let description = '';
    const isSale = shouldCountInAdminSales(row, indexes);
    const classified = classifyAdminSale({
      subscription_id: row.subscription_id,
      status_detail: row.status_detail,
      planName,
      billingTerm: sub?.billing_term,
    });
    description = classified.description;
    if (classified.saleType !== 'assinatura') saleType = classified.saleType;
    else if (isSale) saleType = 'assinatura';

    detailRows.push([
      day,
      row.id,
      profileById.get(row.user_id ?? '')?.full_name ?? '',
      profileById.get(row.user_id ?? '')?.email ?? '',
      SALE_TYPE_LABEL[saleType] ?? saleType,
      description,
      planName ?? '',
      row.payment_method ?? '',
      money(row.amount_cents),
      money(amount),
      counted ? 'Sim' : 'Não (duplicata/parcela de combo)',
    ]);

    if (!counted || amount <= 0) continue;

    const userId = row.user_id ?? 'sem-usuario';
    const c = getClient(userId);
    const isNewBuyer = c.orders === 0;
    c.orders += 1;
    c.revenueCents += amount;
    c.months.add(month);
    c.first ??= day;
    c.last = day;

    const m =
      monthly.get(month) ??
      {
        orders: 0,
        revenue: 0,
        acquisitionCents: 0,
        acquisitions: 0,
        renewalCents: 0,
        renewals: 0,
        storeCents: 0,
        storeOrders: 0,
        buyers: new Set<string>(),
        newBuyers: 0,
      };
    m.orders += 1;
    m.revenue += amount;
    m.buyers.add(userId);
    if (isNewBuyer) m.newBuyers += 1;

    if (saleType === 'loja_avulsa' || saleType === 'loja_bundled') {
      c.storeCents += amount;
      c.storeOrders += 1;
      m.storeCents += amount;
      m.storeOrders += 1;
    } else if (saleType === 'assinatura') {
      c.subscriptionCents += amount;
      c.acquisitions += 1;
      m.acquisitionCents += amount;
      m.acquisitions += 1;
    } else {
      c.renewalCents += amount;
      c.renewals += 1;
      m.renewalCents += amount;
      m.renewals += 1;
    }
    monthly.set(month, m);

    if (planName && row.subscription_id) {
      const p = byPlan.get(planName) ?? { orders: 0, revenue: 0, buyers: new Set<string>() };
      p.orders += 1;
      p.revenue += amount;
      p.buyers.add(userId);
      byPlan.set(planName, p);
    }

    const method = row.payment_method ?? 'não informado';
    const pm = byMethod.get(method) ?? { orders: 0, revenue: 0 };
    pm.orders += 1;
    pm.revenue += amount;
    byMethod.set(method, pm);
  }

  for (const row of payments) {
    if (!row.user_id) continue;
    if (row.status === 'refunded' || row.status === 'charged_back') {
      const c = getClient(row.user_id);
      c.refundedCount += 1;
      c.refundedCents += row.amount_cents;
    } else if (row.status === 'cancelled' || row.status === 'rejected') {
      getClient(row.user_id).failedCount += 1;
    }
  }

  const today = toBrazilDateKey(new Date().toISOString());
  const outDir = resolve(process.cwd(), 'reports', `vendas-${today}`);
  mkdirSync(outDir, { recursive: true });

  const buyers = Array.from(clients.values()).filter((c) => c.orders > 0);
  buyers.sort((a, b) => b.revenueCents - a.revenueCents);
  const totalRevenue = buyers.reduce((s, c) => s + c.revenueCents, 0);
  let running = 0;

  writeCsv(
    resolve(outDir, '1-vendas-por-cliente.csv'),
    [
      'Ranking',
      'Nome',
      'E-mail',
      'Telefone',
      'Cidade',
      'UF',
      'Plano atual',
      'Modalidade',
      'Status assinatura',
      'Cliente desde',
      'Primeira compra',
      'Última compra',
      'Qtd compras',
      'Meses com compra',
      'Receita total (R$)',
      'Assinatura - aquisição (R$)',
      'Assinatura - renovações (R$)',
      'Loja (R$)',
      'Qtd renovações',
      'Qtd pedidos loja',
      'Ticket médio (R$)',
      '% da receita',
      '% acumulado',
      'Reembolsos/chargebacks',
      'Reembolsado (R$)',
      'Cobranças canceladas/recusadas',
    ],
    buyers.map((c, i) => {
      running += c.revenueCents;
      const profile = profileById.get(c.userId);
      const address = addressByUser.get(c.userId);
      const subs = (subsByUser.get(c.userId) ?? []).sort((a, b) =>
        (b.created_at ?? '').localeCompare(a.created_at ?? '')
      );
      const currentSub = subs.find((s) => s.status === 'active') ?? subs[0];
      return [
        i + 1,
        profile?.full_name ?? '',
        profile?.email ?? '',
        profile?.phone ?? '',
        address?.city ?? '',
        address?.state ?? '',
        one(currentSub?.plans)?.name ?? '',
        currentSub?.billing_term ?? '',
        currentSub?.status ?? 'sem assinatura',
        profile?.created_at ? toBrazilDateKey(profile.created_at) : '',
        c.first,
        c.last,
        c.orders,
        c.months.size,
        money(c.revenueCents),
        money(c.subscriptionCents),
        money(c.renewalCents),
        money(c.storeCents),
        c.renewals,
        c.storeOrders,
        money(Math.round(c.revenueCents / c.orders)),
        ((c.revenueCents / totalRevenue) * 100).toFixed(2).replace('.', ','),
        ((running / totalRevenue) * 100).toFixed(2).replace('.', ','),
        c.refundedCount,
        money(c.refundedCents),
        c.failedCount,
      ];
    })
  );

  const months = Array.from(monthly.keys()).sort();
  writeCsv(
    resolve(outDir, '2-vendas-por-mes.csv'),
    [
      'Mês',
      'Receita total (R$)',
      'Qtd cobranças',
      'Clientes pagantes',
      'Clientes novos',
      'Aquisições assinatura',
      'Receita aquisição (R$)',
      'Renovações',
      'Receita renovação (R$)',
      'Pedidos loja',
      'Receita loja (R$)',
      'Ticket médio (R$)',
    ],
    months.map((key) => {
      const m = monthly.get(key)!;
      return [
        key,
        money(m.revenue),
        m.orders,
        m.buyers.size,
        m.newBuyers,
        m.acquisitions,
        money(m.acquisitionCents),
        m.renewals,
        money(m.renewalCents),
        m.storeOrders,
        money(m.storeCents),
        money(Math.round(m.revenue / m.orders)),
      ];
    })
  );

  writeCsv(
    resolve(outDir, '3-vendas-por-plano.csv'),
    ['Plano', 'Qtd cobranças', 'Clientes', 'Receita (R$)', '% da receita de assinatura'],
    (() => {
      const subTotal = Array.from(byPlan.values()).reduce((s, p) => s + p.revenue, 0);
      return Array.from(byPlan.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .map(([name, p]) => [
          name,
          p.orders,
          p.buyers.size,
          money(p.revenue),
          ((p.revenue / subTotal) * 100).toFixed(2).replace('.', ','),
        ]);
    })()
  );

  writeCsv(
    resolve(outDir, '4-pagamentos-detalhados.csv'),
    [
      'Data',
      'ID pagamento',
      'Cliente',
      'E-mail',
      'Tipo',
      'Descrição',
      'Plano',
      'Método',
      'Valor cobrado (R$)',
      'Valor contábil (R$)',
      'Conta na receita',
    ],
    detailRows
  );

  const subsCount = (status: string) => subscriptions.filter((s) => s.status === status).length;
  const subStatuses = Array.from(new Set(subscriptions.map((s) => s.status))).sort();
  const totalOrders = buyers.reduce((s, c) => s + c.orders, 0);
  const repeat = buyers.filter((c) => c.orders > 1).length;
  const top10 = buyers.slice(0, Math.ceil(buyers.length * 0.1));
  const top10Revenue = top10.reduce((s, c) => s + c.revenueCents, 0);
  const storeTotal = buyers.reduce((s, c) => s + c.storeCents, 0);
  const acqTotal = buyers.reduce((s, c) => s + c.subscriptionCents, 0);
  const renTotal = buyers.reduce((s, c) => s + c.renewalCents, 0);
  const refundedTotal = Array.from(clients.values()).reduce((s, c) => s + c.refundedCents, 0);
  const refundedCount = Array.from(clients.values()).reduce((s, c) => s + c.refundedCount, 0);

  const summary = [
    `RELATÓRIO DE VENDAS DUNGEONBOX`,
    `Período: ${months[0]} a ${months[months.length - 1]} (gerado em ${today})`,
    ``,
    `Receita total: R$ ${money(totalRevenue)}`,
    `  Assinaturas (aquisição): R$ ${money(acqTotal)}`,
    `  Assinaturas (renovação): R$ ${money(renTotal)}`,
    `  Loja: R$ ${money(storeTotal)}`,
    `Cobranças contabilizadas: ${totalOrders}`,
    `Clientes pagantes: ${buyers.length}`,
    `Cadastros totais: ${profiles.length} (conversão cadastro -> compra: ${((buyers.length / profiles.length) * 100).toFixed(1)}%)`,
    `Ticket médio por cobrança: R$ ${money(Math.round(totalRevenue / totalOrders))}`,
    `Receita média por cliente (LTV até agora): R$ ${money(Math.round(totalRevenue / buyers.length))}`,
    `Clientes com mais de 1 compra: ${repeat} (${((repeat / buyers.length) * 100).toFixed(1)}%)`,
    `Top 10% clientes (${top10.length}) = ${((top10Revenue / totalRevenue) * 100).toFixed(1)}% da receita`,
    `Reembolsos/chargebacks: ${refundedCount} (R$ ${money(refundedTotal)})`,
    ``,
    `Assinaturas por status:`,
    ...subStatuses.map((s) => `  ${s}: ${subsCount(s)}`),
    ``,
    `Por método de pagamento:`,
    ...Array.from(byMethod.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .map(([k, v]) => `  ${k}: ${v.orders} cobranças, R$ ${money(v.revenue)}`),
    ``,
    `Por mês:`,
    ...months.map((k) => {
      const m = monthly.get(k)!;
      return `  ${k}: R$ ${money(m.revenue)} | ${m.orders} cobranças | ${m.buyers.size} clientes | ${m.newBuyers} novos`;
    }),
    ``,
    `Regras: só pagamentos aprovados; mesmas regras do painel admin`,
    `(sem duplicatas de importação Asaas, combo parcelado contado pelo valor total na compra).`,
  ].join('\n');

  writeFileSync(resolve(outDir, '0-resumo.txt'), `${summary}\n`, 'utf8');
  console.log(summary);
  console.log(`\nArquivos em ${outDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
