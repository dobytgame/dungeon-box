import Link from 'next/link';
import { ChevronRight, Package } from 'lucide-react';
import StoreOrderFulfillmentBadge from '@/components/dashboard/StoreOrderFulfillmentBadge';
import {
  formatStoreOrderShippingLabel,
  type DashboardStoreOrderListRow,
} from '@/lib/dashboard/store-orders';
import { DASHBOARD_ROUTES } from '@/lib/dashboard/routes';
import { formatDateTime, formatMoney } from '@/lib/dashboard/format';

interface Props {
  orders: DashboardStoreOrderListRow[];
}

export default function StoreOrdersList({ orders }: Props) {
  return (
    <ul className="space-y-4">
      {orders.map((order) => (
        <li key={order.paymentId}>
          <Link
            href={DASHBOARD_ROUTES.order(order.orderId)}
            className="group block rounded-sm border border-white/[0.06] border-l-4 border-l-ember/50 bg-stone-950/40 p-5 transition hover:border-white/10 hover:bg-stone-950/60"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-3">
                  <Package
                    className="mt-1 h-4 w-4 shrink-0 text-stone-600"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="font-display text-lg uppercase tracking-wide text-white">
                      {formatMoney(order.amountCents)}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-stone-300">
                      {order.itemsSummary}
                    </p>
                    <p className="mt-2 text-xs text-stone-500">
                      {formatDateTime(order.paidAt ?? order.createdAt)}
                      {' · '}
                      {formatStoreOrderShippingLabel(order.shippingMode)}
                      {order.cycleNumber
                        ? ` · Ciclo #${order.cycleNumber}`
                        : ''}
                    </p>
                    {order.trackingCode ? (
                      <p className="mt-1 text-xs text-stone-500">
                        Rastreio: {order.carrier ?? 'Transportadora'}{' '}
                        {order.trackingCode}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <StoreOrderFulfillmentBadge
                  fulfillmentStatus={order.fulfillmentStatus}
                  paymentStatus={order.paymentStatus}
                />
                <ChevronRight
                  className="h-4 w-4 text-stone-600 transition group-hover:text-ember"
                  aria-hidden="true"
                />
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
