import Link from 'next/link';
import AdminSearchForm from '@/components/admin/AdminSearchForm';
import AdminSection from '@/components/admin/AdminSection';
import AdminTable from '@/components/admin/AdminTable';
import KpiCard from '@/components/admin/KpiCard';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { requireAdmin } from '@/lib/admin/auth';
import { getAdminSalesSummary, listAdminSales } from '@/lib/admin/sales';
import type { AdminSaleType, AdminSaleRow } from '@/lib/admin/sales';
import type { PaymentStatus } from '@/lib/dashboard/types';
import { formatDate, formatMoney } from '@/lib/dashboard/format';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'pending', label: 'Pendente' },
  { value: 'rejected', label: 'Recusado' },
  { value: 'refunded', label: 'Reembolsado' },
];

const TYPE_BADGE: Record<AdminSaleType, string> = {
  assinatura: 'text-console',
  loja_avulsa: 'text-violet-300',
  loja_bundled: 'text-amber-200',
  outro: 'text-zinc-400',
};

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminSalesPage({ searchParams }: Props) {
  const { admin } = await requireAdmin();
  const { status } = await searchParams;
  const [sales, summary] = await Promise.all([
    listAdminSales(admin, { status: status || undefined, limit: 200 }),
    getAdminSalesSummary(admin),
  ]);

  const totalApproved =
    summary.assinatura.revenueCents +
    summary.loja_avulsa.revenueCents +
    summary.loja_bundled.revenueCents +
    summary.outro.revenueCents;

  return (
    <div className="space-y-8">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Assinaturas"
          value={String(summary.assinatura.count)}
          hint={formatMoney(summary.assinatura.revenueCents)}
          accent="console"
        />
        <KpiCard
          label="Loja avulsa"
          value={String(summary.loja_avulsa.count)}
          hint={formatMoney(summary.loja_avulsa.revenueCents)}
        />
        <KpiCard
          label="Loja + assinatura"
          value={String(summary.loja_bundled.count)}
          hint={formatMoney(summary.loja_bundled.revenueCents)}
          accent="gold"
        />
        <KpiCard
          label="Receita aprovada"
          value={formatMoney(totalApproved)}
          hint="Soma das vendas aprovadas"
          accent="warn"
        />
      </section>

      <AdminSearchForm placeholder="Busca em breve" name="q" defaultValue="">
        <div>
          <label htmlFor="sale-status" className="sr-only">
            Status
          </label>
          <select
            id="sale-status"
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

      <AdminSection title="Todas as vendas">
        <AdminTable
          rows={sales}
          columns={[
            {
              key: 'type',
              header: 'Tipo',
              cell: (row: AdminSaleRow) => (
                <span className={`font-mono text-[11px] uppercase tracking-widest ${TYPE_BADGE[row.saleType]}`}>
                  {row.saleTypeLabel}
                </span>
              ),
            },
            {
              key: 'customer',
              header: 'Cliente',
              cell: (row: AdminSaleRow) => (
                <div>
                  <p>{row.customerName ?? '—'}</p>
                  <p className="font-mono text-[11px] text-zinc-600">{row.customerEmail}</p>
                </div>
              ),
            },
            {
              key: 'description',
              header: 'Descrição',
              cell: (row: AdminSaleRow) => (
                <div>
                  <p className="text-sm text-zinc-300">{row.description}</p>
                  {row.planName && row.saleType !== 'assinatura' ? (
                    <p className="font-mono text-[10px] text-zinc-600">
                      Assinatura: {row.planName}
                    </p>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'amount',
              header: 'Valor',
              cell: (row: AdminSaleRow) => (
                <div className={row.countsInRevenue ? '' : 'opacity-60'}>
                  <span className="font-mono tabular-nums">
                    {formatMoney(
                      row.countsInRevenue
                        ? row.effectiveAmountCents
                        : row.amount_cents
                    )}
                  </span>
                  {row.installmentCount != null && row.installmentCount > 1 ? (
                    <p className="text-xs text-stone-500">
                      {row.installmentCount}x no cartão
                    </p>
                  ) : null}
                  {row.isComboInstallmentSlice ? (
                    <p className="text-xs text-stone-500">
                      Parcela do combo · não soma na receita
                    </p>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              cell: (row: AdminSaleRow) => (
                <StatusBadge kind="payment" status={row.status as PaymentStatus} />
              ),
            },
            {
              key: 'paid',
              header: 'Data',
              cell: (row: AdminSaleRow) => (
                <span className="font-mono text-[11px] text-zinc-400">
                  {formatDate(row.paid_at ?? row.created_at)}
                </span>
              ),
            },
          ]}
          emptyMessage="Nenhuma venda encontrada."
        />
      </AdminSection>

      <p className="font-mono text-[11px] text-zinc-600">
        {sales.length} registro(s).{' '}
        <Link href="/admin/vendas" className="text-console hover:underline">
          Limpar filtros
        </Link>
      </p>
    </div>
  );
}
