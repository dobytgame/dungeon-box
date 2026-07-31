import { formatMoney } from '@/lib/dashboard/format';
import type { AdminStoreOrderPurchaseView } from '@/lib/admin/store-order-lines';

interface Props {
  purchase: AdminStoreOrderPurchaseView;
}

export default function StoreOrderItemsList({ purchase }: Props) {
  if (purchase.items.length === 0) {
    return <p className="text-sm text-stone-500">Nenhum item registrado.</p>;
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-4 text-sm text-stone-300">
        {purchase.items.map((item, index) => (
          <li
            key={`${purchase.orderId}-${index}`}
            className="flex items-start justify-between gap-4 border-b border-white/[0.04] pb-4 last:border-0 last:pb-0"
          >
            <span className="min-w-0">
              <span className="block text-stone-100">
                {item.name}
                {item.quantity > 1 ? ` ×${item.quantity}` : ''}
              </span>
              {item.detail ? (
                <span className="mt-0.5 block text-xs text-stone-500">
                  {item.detail}
                </span>
              ) : null}
              {item.customizationImageUrls &&
              item.customizationImageUrls.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.customizationImageUrls.map((url, imageIndex) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="block overflow-hidden rounded-sm border border-white/10"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Personalização ${imageIndex + 1}`}
                        className="h-20 w-20 object-cover"
                      />
                    </a>
                  ))}
                </div>
              ) : null}
            </span>
            <span className="shrink-0 tabular-nums text-stone-400">
              {formatMoney(item.lineTotalCents)}
            </span>
          </li>
        ))}
      </ul>

      <div className="space-y-1 border-t border-white/[0.04] pt-4 text-xs text-stone-500">
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
        <p className="text-sm text-stone-300">
          Total: {formatMoney(purchase.amountCents)}
        </p>
      </div>
    </div>
  );
}
