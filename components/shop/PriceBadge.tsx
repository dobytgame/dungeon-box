import { formatMoney } from '@/lib/dashboard/format';

interface Props {
  priceCents: number;
  priceLabel: string;
  originalPriceCents?: number;
  featured?: boolean;
  size?: 'sm' | 'lg';
}

export default function PriceBadge({
  priceCents,
  priceLabel,
  originalPriceCents,
  featured,
  size = 'lg',
}: Props) {
  const onSale =
    originalPriceCents !== undefined && originalPriceCents > priceCents;
  const priceClass =
    size === 'lg' ? 'font-display text-3xl text-ember' : 'font-display text-2xl text-gold';

  return (
    <div className="flex flex-wrap items-center gap-3">
      {onSale ? (
        <>
          <span className="rounded-sm bg-ember/15 px-2 py-1 font-display text-[10px] uppercase tracking-widest text-ember">
            Oferta
          </span>
          <p className="font-display text-lg text-stone-500 line-through">
            {formatMoney(originalPriceCents)}
          </p>
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
