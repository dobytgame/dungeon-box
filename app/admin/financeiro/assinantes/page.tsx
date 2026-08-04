import Link from 'next/link';
import AdminGatewayMigrationTools from '@/components/admin/AdminGatewayMigrationTools';
import AdminTable from '@/components/admin/AdminTable';
import { requireAdmin } from '@/lib/admin/auth';
import {
  listBillingDaySubscriptions,
  todayYmd,
  type BillingDayGateway,
} from '@/lib/admin/billing-day-subscriptions';
import { formatDate, formatDateTime } from '@/lib/dashboard/format';

const GATEWAY_LABEL: Record<BillingDayGateway, string> = {
  pagarme: 'Pagar.me',
  asaas: 'Asaas',
  stripe: 'Stripe',
  mp: 'Mercado Pago',
  none: '—',
};

const GATEWAY_CLASS: Record<BillingDayGateway, string> = {
  pagarme: 'text-console',
  asaas: 'text-amber-300',
  stripe: 'text-violet-300',
  mp: 'text-sky-300',
  none: 'text-zinc-500',
};

interface Props {
  searchParams: Promise<{
    date?: string;
    gateway?: string;
    status?: string;
  }>;
}

function isYmd(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export default async function AdminBillingDaySubscribersPage({
  searchParams,
}: Props) {
  const { admin } = await requireAdmin();
  const params = await searchParams;
  const dateYmd = isYmd(params.date) ? params.date : todayYmd();
  const gatewayRaw = params.gateway ?? 'all';
  const gateway = (
    ['all', 'pagarme', 'asaas', 'stripe', 'mp', 'none'].includes(gatewayRaw)
      ? gatewayRaw
      : 'all'
  ) as BillingDayGateway | 'all';
  const status = params.status === 'all' ? 'all' : params.status ?? 'active';

  const rows = await listBillingDaySubscriptions(admin, {
    dateYmd,
    gateway,
    status,
  });

  const asaasCount = rows.filter((row) => row.gateway === 'asaas').length;
  const pagarmeCount = rows.filter((row) => row.gateway === 'pagarme').length;
  const needsEmail = rows.filter((row) => row.needsMigration).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            Financeiro
          </p>
          <h1 className="mt-1 text-xl font-medium text-zinc-100">
            Assinantes do dia
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">
            Cobranças com vencimento na data escolhida, gateway ativo e envio
            manual do e-mail de migração Asaas → Pagar.me.
          </p>
        </div>
        <Link
          href="/admin/financeiro"
          className="font-mono text-[10px] uppercase tracking-widest text-console hover:underline"
        >
          ← Voltar ao financeiro
        </Link>
      </div>

      <form
        method="get"
        className="admin-panel flex flex-wrap items-end gap-3 rounded p-4"
      >
        <label className="space-y-1">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Data de cobrança
          </span>
          <input
            type="date"
            name="date"
            defaultValue={dateYmd}
            className="rounded-sm border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100"
          />
        </label>
        <label className="space-y-1">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Gateway
          </span>
          <select
            name="gateway"
            defaultValue={gateway}
            className="rounded-sm border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100"
          >
            <option value="all">Todos</option>
            <option value="asaas">Asaas</option>
            <option value="pagarme">Pagar.me</option>
            <option value="stripe">Stripe</option>
            <option value="mp">Mercado Pago</option>
            <option value="none">Sem gateway</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Status
          </span>
          <select
            name="status"
            defaultValue={status}
            className="rounded-sm border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100"
          >
            <option value="active">Ativas</option>
            <option value="past_due">Em atraso</option>
            <option value="paused">Pausadas</option>
            <option value="all">Todos</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-sm bg-console px-4 py-2.5 font-display text-xs uppercase tracking-widest text-stone-950"
        >
          Filtrar
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="admin-panel rounded px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Total no dia
          </p>
          <p className="mt-1 font-display text-2xl text-zinc-100">{rows.length}</p>
        </div>
        <div className="admin-panel rounded px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Asaas / Pagar.me
          </p>
          <p className="mt-1 font-display text-2xl text-zinc-100">
            {asaasCount} / {pagarmeCount}
          </p>
        </div>
        <div className="admin-panel rounded px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            Precisam migrar
          </p>
          <p className="mt-1 font-display text-2xl text-amber-300">{needsEmail}</p>
        </div>
      </div>

      <AdminTable
        rows={rows}
        emptyMessage="Nenhuma assinatura com cobrança nesta data."
        columns={[
          {
            key: 'customer',
            header: 'Cliente',
            cell: (row) => (
              <div>
                <Link
                  href={`/admin/assinaturas/${row.id}`}
                  className="text-zinc-100 hover:text-console hover:underline"
                >
                  {row.customerName || row.customerEmail || '—'}
                </Link>
                {row.customerEmail ? (
                  <p className="font-mono text-[11px] text-zinc-500">
                    {row.customerEmail}
                  </p>
                ) : null}
              </div>
            ),
          },
          {
            key: 'plan',
            header: 'Plano',
            cell: (row) => (
              <div>
                <p>{row.planName}</p>
                <p className="font-mono text-[11px] text-zinc-500">
                  {row.billingTerm ?? 'monthly'} · {row.status}
                </p>
              </div>
            ),
          },
          {
            key: 'billing',
            header: 'Cobrança',
            cell: (row) => formatDateTime(row.nextBillingDate),
          },
          {
            key: 'gateway',
            header: 'Gateway',
            cell: (row) => (
              <span className={GATEWAY_CLASS[row.gateway]}>
                {GATEWAY_LABEL[row.gateway]}
              </span>
            ),
          },
          {
            key: 'migration',
            header: 'Migração',
            cell: (row) => {
              if (row.migratedAt) {
                return (
                  <span className="text-emerald-400">
                    Migrado {formatDate(row.migratedAt)}
                  </span>
                );
              }
              if (!row.needsMigration) {
                return <span className="text-zinc-500">—</span>;
              }
              return (
                <div className="space-y-1">
                  <p className="text-amber-300">Pendente</p>
                  {row.lastMigrationEmailAt ? (
                    <p className="font-mono text-[10px] text-zinc-500">
                      E-mail {formatDateTime(row.lastMigrationEmailAt)}
                    </p>
                  ) : (
                    <p className="font-mono text-[10px] text-zinc-500">
                      Sem e-mail enviado
                    </p>
                  )}
                </div>
              );
            },
          },
          {
            key: 'actions',
            header: 'Ação',
            cell: (row) =>
              row.needsMigration ? (
                <AdminGatewayMigrationTools subscriptionId={row.id} />
              ) : (
                <span className="text-zinc-600">—</span>
              ),
          },
        ]}
      />
    </div>
  );
}
