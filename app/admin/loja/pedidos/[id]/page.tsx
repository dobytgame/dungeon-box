import Link from 'next/link';
import { notFound } from 'next/navigation';
import StoreOrderDetailPanel from '@/components/admin/StoreOrderDetailPanel';
import { requireAdmin } from '@/lib/admin/auth';
import { getAdminStoreOrderDetail } from '@/lib/admin/store-orders';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminStoreOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const { admin } = await requireAdmin();
  const order = await getAdminStoreOrderDetail(admin, id);

  if (!order) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/loja/pedidos"
        className="inline-block font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500 hover:text-console"
      >
        ← Voltar para pedidos
      </Link>

      <StoreOrderDetailPanel order={order} />
    </div>
  );
}
