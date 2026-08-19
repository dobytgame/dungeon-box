import Link from 'next/link';
import CycleProgress from '@/components/dashboard/CycleProgress';
import DashboardCard from '@/components/dashboard/DashboardCard';
import DataRow from '@/components/dashboard/DataRow';
import StoreOrderFulfillmentBadge from '@/components/dashboard/StoreOrderFulfillmentBadge';
import StoreOrderItemsList from '@/components/dashboard/StoreOrderItemsList';
import {
  formatStoreOrderShippingLabel,
  type DashboardStoreOrderDetail,
} from '@/lib/dashboard/store-orders';
import { DASHBOARD_ROUTES } from '@/lib/dashboard/routes';
import { STORE_ROUTES } from '@/lib/store/routes';
import { formatDateTime, formatMoney } from '@/lib/dashboard/format';
import { formatDashboardTracking } from '@/lib/dashboard/cycle-status';
import { PRODUCTION_PIPELINE } from '@/lib/subscriptions/cycle-production';
import type { CycleStatus } from '@/lib/dashboard/types';

interface Props {
  order: DashboardStoreOrderDetail;
}

export default function StoreOrderDetailView({ order }: Props) {
  const isPendingPayment = order.fulfillmentStatus === 'pending_payment';
  const pipelineStatus = PRODUCTION_PIPELINE.includes(
    order.fulfillmentStatus as CycleStatus
  )
    ? (order.fulfillmentStatus as CycleStatus)
    : null;

  return (
    <div className="space-y-8 md:space-y-10">
      <Link
        href={DASHBOARD_ROUTES.orders}
        className="inline-flex min-h-[44px] items-center font-display text-xs uppercase tracking-widest text-stone-500 transition hover:text-ember"
      >
        ← Voltar aos pedidos
      </Link>

      <DashboardCard
        title={order.itemsSummary}
        accent="ember"
        action={
          <StoreOrderFulfillmentBadge
            fulfillmentStatus={order.fulfillmentStatus}
            paymentStatus={order.paymentStatus}
          />
        }
      >
        {pipelineStatus ? (
          <div className="mb-6">
            <p className="mb-3 font-display text-[0.65rem] uppercase tracking-[0.2em] text-stone-500">
              Andamento
            </p>
            <CycleProgress status={pipelineStatus} showCopy />
          </div>
        ) : null}

        <dl>
          <DataRow label="Valor" value={formatMoney(order.amountCents)} />
          <DataRow
            label="Pedido em"
            value={formatDateTime(order.createdAt)}
          />
          <DataRow
            label="Pago em"
            value={order.paidAt ? formatDateTime(order.paidAt) : '—'}
          />
          <DataRow label="Pagamento" value={order.paymentMethod} />
          <DataRow
            label="Envio"
            value={formatStoreOrderShippingLabel(order.shippingMode)}
          />
          {order.cycleNumber ? (
            <DataRow label="Ciclo" value={`#${order.cycleNumber}`} />
          ) : null}
          <DataRow label="Endereço" value={order.addressLine ?? '—'} />
          {pipelineStatus || order.trackingCode ? (
            <DataRow
              label="Rastreio"
              value={formatDashboardTracking(
                pipelineStatus ?? 'upcoming',
                order.trackingCode,
                order.carrier
              )}
            />
          ) : null}
          {order.shippedAt ? (
            <DataRow
              label="Enviado em"
              value={formatDateTime(order.shippedAt)}
            />
          ) : null}
          {order.deliveredAt ? (
            <DataRow
              label="Entregue em"
              value={formatDateTime(order.deliveredAt)}
            />
          ) : null}
          <DataRow label="Referência" value={order.orderId} mono />
        </dl>

        {isPendingPayment ? (
          <Link
            href={STORE_ROUTES.orderPayment(order.orderId)}
            className="mt-6 inline-flex min-h-[44px] items-center font-display text-xs uppercase tracking-widest text-ember hover:text-ember-bright"
          >
            Concluir pagamento →
          </Link>
        ) : null}
      </DashboardCard>

      <DashboardCard title="Itens do pedido" accent="none">
        <StoreOrderItemsList purchase={order.purchaseView} />
      </DashboardCard>
    </div>
  );
}
