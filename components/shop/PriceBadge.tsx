import StoreBadge from '@/components/store/StoreBadge';
import { formatMoney } from '@/lib/dashboard/format';
import { formatSubscriberDiscountBadge } from '@/lib/store/subscriber-discount';

interface Props {
  priceCents: number;
  priceLabel: string;
  originalPriceCents?: number;
  featured?: boolean;
  subscriberDiscount?: boolean;
  subscriberDiscountPercent?: number;
  size?: 'sm' | 'lg';
}

export default function PriceBadge({
  priceCents,
  priceLabel,
  originalPriceCents,
  featured,
  subscriberDiscount,
  subscriberDiscountPercent,
  size = 'lg',
}: Props) {
  const onSale = originalPriceCents !== undefined && originalPriceCents > priceCents;
  const subscriberBadgeLabel = formatSubscriberDiscountBadge(subscriberDiscountPercent);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <p
        className={`font-semibold tabular-nums text-mesa-parchment ${
          size === 'lg' ? 'text-[2rem] leading-none' : 'text-2xl leading-none'
        }`}
      >
        {priceLabel}
      </p>
      {onSale ? (
        <p className="text-base tabular-nums text-mesa-ash line-through">
          {formatMoney(originalPriceCents)}
        </p>
      ) : null}
      {onSale ? (
        subscriberDiscount ? (
          <StoreBadge tone="jade">{subscriberBadgeLabel}</StoreBadge>
        ) : (
          <StoreBadge tone="ember">Oferta</StoreBadge>
        )
      ) : featured ? (
        <StoreBadge tone="ember">Destaque</StoreBadge>
      ) : null}
    </div>
  );
}
