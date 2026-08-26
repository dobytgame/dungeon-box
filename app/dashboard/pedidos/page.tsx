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
import {
  listDashboardPaintKitAddonOrders,
  mergeDashboardStoreOrders,
} from '@/lib/dashboard/paint-kit-addon-order';
import { syncPendingPagarmeStoreOrders } from '@/lib/asaas/store-order-payment';
import { createAdminClient } from '@/lib/supabase/admin';

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

  const admin = createAdminClient();
  await syncPendingPagarmeStoreOrders(admin, { userId: user.id });

  const storeOrders = await listDashboardStoreOrders(supabase, user.id, {
    limit: 200,
  });
  const addonOrders = await listDashboardPaintKitAddonOrders(
    admin,
    user.id,
    storeOrders
  );
  let allOrders = mergeDashboardStoreOrders(storeOrders, addonOrders);

  if (shipping === 'standalone' || shipping === 'bundled') {
    const mode = shipping === 'standalone' ? 'standalone' : 'with_subscription';
    allOrders = allOrders.filter((order) => order.shippingMode === mode);
  }

  if (q?.trim()) {
    const needle = q.trim().toLowerCase();
    allOrders = allOrders.filter(
      (order) =>
        order.orderId.toLowerCase().includes(needle) ||
        order.itemsSummary.toLowerCase().includes(needle) ||
        (order.trackingCode?.toLowerCase().includes(needle) ?? false)
    );
  }

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
          description="Compras da loja e o kit extra de pintura aparecem aqui com status de pagamento, produção e envio."
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
