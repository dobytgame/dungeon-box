import Link from 'next/link';
import AdminSearchForm from '@/components/admin/AdminSearchForm';
import AdminTable from '@/components/admin/AdminTable';
import StoreOrderStatusTabs from '@/components/admin/StoreOrderStatusTabs';
import StatusBadge from '@/components/dashboard/StatusBadge';
import { requireAdmin } from '@/lib/admin/auth';
import {
  countAdminStoreOrdersByStatus,
  formatStoreOrderShippingLabel,
  listAdminStoreOrders,
} from '@/lib/admin/store-orders';
import { formatDateTime, formatMoney } from '@/lib/dashboard/format';
import { cycleStatusLabel } from '@/lib/subscriptions/cycle-production';

const SHIPPING_OPTIONS = [
  { value: '', label: 'Todos os envios' },
  { value: 'standalone', label: 'Avulso' },
  { value: 'bundled', label: 'Com assinatura' },
];

interface Props {
  searchParams: Promise<{
    q?: string;
    status?: string;
    shipping?: string;
  }>;
}

function fulfillmentLabel(
  paymentStatus: string,
  fulfillmentStatus: string
): string {
  if (fulfillmentStatus === 'pending_payment') {
    return 'Aguardando pagamento';
  }
  return cycleStatusLabel(fulfillmentStatus as never);
}

export default async function AdminStoreOrdersPage({ searchParams }: Props) {
  const { admin } = await requireAdmin();
  const { q, status = 'all', shipping = '' } = await searchParams;

  const allRows = await listAdminStoreOrders(admin, {
    q,
    shipping:
      shipping === 'standalone' || shipping === 'bundled' ? shipping : '',
    limit: 300,
  });
  const counts = countAdminStoreOrdersByStatus(allRows);
  const rows =
    status === 'all'
      ? allRows
      : allRows.filter((row) => row.fulfillmentStatus === status);

  return (
    <div className="space-y-6">
      <div className="admin-panel rounded p-4 text-sm text-zinc-400">
        Pedidos pagos na loja pública. Pedidos avulsos são controlados aqui; pedidos
        vinculados à assinatura seguem o ciclo em{' '}
        <Link href="/admin/ciclos" className="text-console hover:underline">
          Produção
        </Link>
        .
      </div>

      <AdminSearchForm
        defaultValue={q ?? ''}
        placeholder="Cliente, e-mail, produto ou rastreio"
      >
        <div>
          <label htmlFor="shipping" className="sr-only">
            Tipo de envio
          </label>
          <select
            id="shipping"
            name="shipping"
            defaultValue={shipping}
            className="rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white"
          >
            {SHIPPING_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {status && status !== 'all' ? (
          <input type="hidden" name="status" value={status} />
        ) : null}
      </AdminSearchForm>

      <StoreOrderStatusTabs
        currentStatus={status}
        counts={counts}
        q={q}
        shipping={shipping}
      />

      <AdminTable
        rows={rows}
        getRowHref={(row) => `/admin/loja/pedidos/${row.paymentId}`}
        columns={[
          {
            key: 'customer',
            header: 'Cliente',
            cell: (row) => (
              <div>
                <p className="text-zinc-100">
                  {row.customerName ?? row.customerEmail ?? '—'}
                </p>
                {row.customerEmail && row.customerName ? (
                  <p className="text-xs text-zinc-500">{row.customerEmail}</p>
                ) : null}
              </div>
            ),
          },
          {
            key: 'items',
            header: 'Itens',
            cell: (row) => (
              <p className="max-w-xs truncate text-zinc-300">{row.itemsSummary}</p>
            ),
          },
          {
            key: 'shipping',
            header: 'Envio',
            cell: (row) => formatStoreOrderShippingLabel(row.shippingMode),
          },
          {
            key: 'status',
            header: 'Status',
            cell: (row) =>
              row.fulfillmentStatus === 'pending_payment' ? (
                <StatusBadge kind="payment" status={row.paymentStatus} />
              ) : (
                <StatusBadge kind="cycle" status={row.fulfillmentStatus} />
              ),
          },
          {
            key: 'amount',
            header: 'Valor',
            className: 'tabular-nums',
            cell: (row) => formatMoney(row.amountCents),
          },
          {
            key: 'paid',
            header: 'Data',
            cell: (row) =>
              row.paidAt
                ? formatDateTime(row.paidAt)
                : row.createdAt
                  ? formatDateTime(row.createdAt)
                  : '—',
          },
          {
            key: 'location',
            header: 'Destino',
            cell: (row) =>
              row.city && row.state ? `${row.city} / ${row.state}` : '—',
          },
        ]}
        emptyMessage="Nenhum pedido da loja encontrado."
      />

      <p className="text-xs text-stone-500">
        {rows.length} pedido(s)
        {status !== 'all'
          ? ` · ${fulfillmentLabel('', status)}`
          : ''}
        .{' '}
        <Link href="/admin/loja/pedidos" className="text-console hover:underline">
          Limpar filtros
        </Link>
      </p>
    </div>
  );
}
