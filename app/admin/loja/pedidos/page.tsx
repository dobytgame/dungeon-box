import Link from 'next/link';
import StoreOrdersPageClient from '@/components/admin/StoreOrdersPageClient';
import { requireAdmin } from '@/lib/admin/auth';
import {
  countAdminStoreOrdersByStatus,
  listAdminStoreOrders,
} from '@/lib/admin/store-orders';

interface Props {
  searchParams: Promise<{
    q?: string;
    status?: string;
    shipping?: string;
  }>;
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

      <StoreOrdersPageClient
        rows={rows}
        counts={counts}
        q={q}
        status={status}
        shipping={shipping}
      />
    </div>
  );
}
