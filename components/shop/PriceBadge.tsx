import { formatMoney } from '@/lib/dashboard/format';
import {
  formatSubscriberDiscountBadge,
  SUBSCRIBER_STORE_DISCOUNT_BADGE,
} from '@/lib/store/subscriber-discount';

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
  const onSale =
    originalPriceCents !== undefined && originalPriceCents > priceCents;
  const subscriberBadgeLabel = subscriberDiscountPercent
    ? formatSubscriberDiscountBadge(subscriberDiscountPercent)
    : SUBSCRIBER_STORE_DISCOUNT_BADGE;
  const priceClass =
    size === 'lg' ? 'font-display text-3xl text-ember' : 'font-display text-2xl text-gold';
  const strikeClass =
    size === 'lg' ? 'font-display text-base text-stone-500 line-through' : 'font-display text-sm text-stone-500 line-through';

  return (
    <div className="flex flex-wrap items-center gap-3">
      {onSale ? (
        <>
          {subscriberDiscount ? (
            <span className="rounded-sm bg-gold/15 px-2 py-1 font-display text-[10px] uppercase tracking-widest text-gold">
              {subscriberBadgeLabel}
            </span>
          ) : (
            <span className="rounded-sm bg-ember/15 px-2 py-1 font-display text-[10px] uppercase tracking-widest text-ember">
              Oferta
            </span>
          )}
          <p className={strikeClass}>{formatMoney(originalPriceCents)}</p>
        </>
      ) : null}
      {featured && !onSale ? (
        <span className="rounded-sm bg-gold/15 px-2 py-1 font-display text-[10px] uppercase tracking-widest text-gold">
          Destaque
        </span>
      ) : null}
      <p className={priceClass}>{priceLabel}</p>
    </div>
  );
}
