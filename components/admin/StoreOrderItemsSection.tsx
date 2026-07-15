'use client';

import { formatMoney } from '@/lib/dashboard/format';
import type { AdminStoreOrderPurchaseView } from '@/lib/admin/store-order-lines';

interface Props {
  purchases: AdminStoreOrderPurchaseView[];
  showOrderId?: boolean;
}

export default function StoreOrderItemsSection({
  purchases,
  showOrderId = false,
}: Props) {
  if (purchases.length === 0) return null;

  return (
    <div className="space-y-5">
      {purchases.map((purchase) => (
        <div key={purchase.paymentId ?? purchase.orderId}>
          {showOrderId && purchases.length > 1 ? (
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600">
              Pedido {purchase.orderId}
            </p>
          ) : null}

          {purchase.items.length > 0 ? (
            <ul className="space-y-2 text-sm text-zinc-300">
              {purchase.items.map((item, index) => (
                <li
                  key={`${purchase.orderId}-${index}`}
                  className="flex items-start justify-between gap-4"
                >
                  <span className="min-w-0">
                    <span className="block text-zinc-100">
                      {item.name}
                      {item.quantity > 1 ? ` ×${item.quantity}` : ''}
                    </span>
                    {item.detail ? (
                      <span className="mt-0.5 block text-xs text-zinc-500">
                        {item.detail}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-zinc-500">
                    {formatMoney(item.lineTotalCents)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">Nenhum item registrado.</p>
          )}

          <div className="mt-3 space-y-1 text-xs text-zinc-500">
            {purchase.shippingLabel ? (
              <p>
                Frete: {purchase.shippingLabel}
                {purchase.shippingCents
                  ? ` · ${formatMoney(purchase.shippingCents)}`
                  : ''}
              </p>
            ) : null}
            {purchase.couponCode ? (
              <p>
                Cupom {purchase.couponCode}
                {purchase.couponDiscountCents
                  ? ` · −${formatMoney(purchase.couponDiscountCents)}`
                  : ''}
              </p>
            ) : null}
            <p className="text-zinc-400">
              Total pago: {formatMoney(purchase.amountCents)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
