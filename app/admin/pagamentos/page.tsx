import Link from 'next/link';
import AdminSearchForm from '@/components/admin/AdminSearchForm';
import AdminTable from '@/components/admin/AdminTable';
import PendingPaymentLinkPanel from '@/components/admin/PendingPaymentLinkPanel';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { requireAdmin } from '@/lib/admin/auth';
import { buildAdminPendingPaymentPanel } from '@/lib/admin/pending-payment';
import { listAdminPayments } from '@/lib/admin/queries';
import type { PaymentStatus } from '@/lib/dashboard/types';
import { formatDate, formatMoney } from '@/lib/dashboard/format';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'pending', label: 'Pendente' },
  { value: 'rejected', label: 'Recusado' },
  { value: 'refunded', label: 'Reembolsado' },
];

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminPaymentsPage({ searchParams }: Props) {
  const { admin } = await requireAdmin();
  const { status } = await searchParams;
  const payments = await listAdminPayments(admin, {
    status: status || undefined,
    limit: 100,
  });

  const pendingPanels = await Promise.all(
    payments
      .filter((payment) => payment.status === 'pending')
      .slice(0, 5)
      .map(async (payment) => {
        const panel = await buildAdminPendingPaymentPanel(admin, {
          paymentId: payment.id,
        });
        return panel
          ? {
              paymentId: payment.id,
              customerLabel: payment.customerName ?? payment.customerEmail ?? 'Cliente',
              panel,
            }
          : null;
      })
  );

  const payablePanels = pendingPanels.filter(Boolean);

  return (
    <div className="space-y-6">
      <AdminSearchForm placeholder="Busca em breve" name="q" defaultValue="">
        <div>
          <label htmlFor="payment-status" className="sr-only">
            Status do pagamento
          </label>
          <select
            id="payment-status"
            name="status"
            defaultValue={status ?? ''}
            className="rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </AdminSearchForm>

      {payablePanels.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-display text-sm uppercase tracking-widest text-stone-400">
            Links de cobrança
          </h2>
          {payablePanels.map((entry) =>
            entry ? (
              <div key={entry.paymentId} className="space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                  {entry.customerLabel}
                </p>
                <PendingPaymentLinkPanel {...entry.panel} paymentId={entry.paymentId} />
              </div>
            ) : null
          )}
        </section>
      ) : null}

      <AdminTable
        rows={payments}
        columns={[
          {
            key: 'customer',
            header: 'Cliente',
            cell: (row) => (
              <div>
                <p>{row.customerName ?? '—'}</p>
                <p className="text-xs text-stone-500">{row.customerEmail}</p>
              </div>
            ),
          },
          {
            key: 'plan',
            header: 'Plano',
            cell: (row) => row.planName ?? '—',
          },
          {
            key: 'amount',
            header: 'Valor',
            cell: (row) => (
              <div>
                <p>{formatMoney(row.effectiveAmountCents)}</p>
                {row.installmentCount != null && row.installmentCount > 1 ? (
                  <p className="text-xs text-stone-500">
                    {row.installmentCount}x no cartão
                  </p>
                ) : null}
                {row.comboLabel ? (
                  <p className="text-xs text-amber-200/80">{row.comboLabel}</p>
                ) : null}
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            cell: (row) => (
              <StatusBadge kind="payment" status={row.status as PaymentStatus} />
            ),
          },
          {
            key: 'method',
            header: 'Método',
            cell: (row) => row.payment_method ?? '—',
          },
          {
            key: 'paid',
            header: 'Pago em',
            cell: (row) => formatDate(row.paid_at ?? row.created_at),
          },
        ]}
      />

      <p className="text-xs text-stone-500">
        {payments.length} registro(s).{' '}
        <Link href="/admin/pagamentos" className="text-console hover:underline">
          Limpar filtros
        </Link>
      </p>
    </div>
  );
}
