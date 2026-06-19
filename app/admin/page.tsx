import Link from 'next/link';
import AdminSection from '@/components/admin/AdminSection';
import AdminTable from '@/components/admin/AdminTable';
import KpiCard from '@/components/admin/KpiCard';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { requireAdmin } from '@/lib/admin/auth';
import { getAdminDashboardStats } from '@/lib/admin/queries';
import { formatDate, formatMoney } from '@/lib/dashboard/format';

export default async function AdminDashboardPage() {
  const { admin } = await requireAdmin();
  const stats = await getAdminDashboardStats(admin);

  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="MRR"
          value={formatMoney(stats.mrrCents)}
          hint={`${stats.activeSubscribers} assinantes ativos`}
          accent="console"
        />
        <KpiCard
          label="Novos (30d)"
          value={String(stats.newSubscribers30d)}
          hint={`${stats.cancelled30d} cancelamentos no período`}
        />
        <KpiCard
          label="Fila de envio"
          value={String(stats.cyclesPendingShip)}
          hint={`${stats.cyclesPreparing} ciclos em produção`}
          accent="warn"
        />
        <KpiCard
          label="Receita (30d)"
          value={formatMoney(stats.revenueApproved30dCents)}
          hint={`${stats.paymentsApproved30d} pagamentos aprovados`}
          accent="gold"
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Em atraso"
          value={String(stats.pastDueCount)}
          hint="Assinaturas past_due"
          accent="danger"
        />
        <KpiCard
          label="Pendentes"
          value={String(stats.pendingSubscriptions)}
          hint="Aguardando ativação"
          accent="warn"
        />
      </section>

      {stats.mrrByPlan.length > 0 ? (
        <AdminSection title="MRR por plano">
          <div className="grid gap-3 sm:grid-cols-3">
            {stats.mrrByPlan.map((row) => (
              <div key={row.planName} className="admin-panel rounded p-4">
                <p className="text-sm text-zinc-200">{row.planName}</p>
                <p className="mt-1 font-mono text-xl tabular-nums text-console">
                  {formatMoney(row.mrrCents)}
                </p>
                <p className="mt-1 font-mono text-[11px] text-zinc-600">
                  {row.subscribers} assinantes
                </p>
              </div>
            ))}
          </div>
        </AdminSection>
      ) : null}

      <AdminSection title="Em preparo" action={{ href: '/admin/ciclos', label: 'Abrir produção' }}>
        <AdminTable
          rows={stats.shipQueue}
          getRowHref={(row) => `/admin/ciclos/${row.id}`}
          columns={[
            {
              key: 'customer',
              header: 'Cliente',
              cell: (row) => (
                <div>
                  <p>{row.customerName ?? '—'}</p>
                  <p className="font-mono text-[11px] text-zinc-600">{row.customerEmail}</p>
                </div>
              ),
            },
            {
              key: 'cycle',
              header: 'Ciclo',
              cell: (row) => `#${row.cycle_number}`,
            },
            {
              key: 'theme',
              header: 'Tema',
              cell: (row) => row.themeName ?? '—',
            },
            {
              key: 'location',
              header: 'Destino',
              cell: (row) =>
                row.city && row.state ? `${row.city}/${row.state}` : '—',
            },
          ]}
          emptyMessage="Nenhuma caixa aguardando rastreio."
        />
      </AdminSection>

      <AdminSection
        title="Pagamentos recentes"
        action={{ href: '/admin/pagamentos', label: 'Ver todos' }}
      >
        <AdminTable
          rows={stats.recentPayments.map((payment) => ({
            ...payment,
            id: payment.id,
          }))}
          columns={[
            {
              key: 'amount',
              header: 'Valor',
              cell: (row) => (
                <span className="font-mono tabular-nums">{formatMoney(row.amount_cents)}</span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              cell: (row) => <StatusBadge kind="payment" status={row.status} />,
            },
            {
              key: 'paid',
              header: 'Pago em',
              cell: (row) => (
                <span className="font-mono text-[11px] text-zinc-400">
                  {formatDate(row.paid_at ?? row.created_at)}
                </span>
              ),
            },
            {
              key: 'method',
              header: 'Método',
              cell: (row) => row.payment_method ?? '—',
            },
          ]}
          emptyMessage="Nenhum pagamento registrado."
        />
      </AdminSection>
    </div>
  );
}
