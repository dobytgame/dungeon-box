import DashboardCard from '@/components/dashboard/DashboardCard';
import EmptyState from '@/components/dashboard/EmptyState';
import StoreOrderSearchForm from '@/components/dashboard/StoreOrderSearchForm';
import StoreOrdersList from '@/components/dashboard/StoreOrdersList';
import StoreOrderStatusTabs from '@/components/dashboard/StoreOrderStatusTabs';
import { requireDashboardUser } from '@/lib/dashboard/queries';
import {
  countDashboardStoreOrdersByStatus,
  listDashboardStoreOrders,
} from '@/lib/dashboard/store-orders';

interface Props {
  searchParams: Promise<{
    q?: string;
    status?: string;
    shipping?: string;
  }>;
}

export default async function DashboardOrdersPage({ searchParams }: Props) {
  const { supabase, user } = await requireDashboardUser();
  const { q, status = 'all', shipping = '' } = await searchParams;

  const allOrders = await listDashboardStoreOrders(supabase, user.id, {
    q,
    shipping:
      shipping === 'standalone' || shipping === 'bundled' ? shipping : '',
    limit: 200,
  });

  const counts = countDashboardStoreOrdersByStatus(allOrders);

  const orders =
    status === 'all'
      ? allOrders
      : allOrders.filter((order) => order.fulfillmentStatus === status);

  return (
    <div className="space-y-8 md:space-y-10">
      {allOrders.length === 0 && !q && !shipping ? (
        <EmptyState
          title="Nenhum pedido ainda"
          description="Compras na loja aparecem aqui com status de pagamento, produção e envio."
          ctaLabel="Ir à loja"
          ctaHref="/loja"
        />
      ) : (
        <>
          <DashboardCard title="Buscar" accent="none">
            <StoreOrderSearchForm q={q} status={status} shipping={shipping} />
          </DashboardCard>

          <StoreOrderStatusTabs
            currentStatus={status}
            counts={counts}
            q={q}
            shipping={shipping}
          />

          {orders.length === 0 ? (
            <EmptyState
              title="Nenhum pedido neste filtro"
              description="Tente outro status ou limpe a busca para ver todos os pedidos."
              ctaLabel="Ver todos"
              ctaHref="/dashboard/pedidos"
            />
          ) : (
            <DashboardCard
              title={`${orders.length} pedido${orders.length === 1 ? '' : 's'}`}
              accent="ember"
            >
              <StoreOrdersList orders={orders} />
            </DashboardCard>
          )}
        </>
      )}
    </div>
  );
}
