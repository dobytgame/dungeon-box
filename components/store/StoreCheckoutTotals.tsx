'use client';

import { formatMoney } from '@/lib/dashboard/format';

interface Props {
  originalSubtotalCents: number;
  hasPromoDiscount: boolean;
  discountedSubtotalCents: number;
  couponDiscountCents: number;
  couponCode: string | null;
  couponSummary: string | null;
  shippingMode: 'standalone' | 'with_subscription';
  shippingCents: number;
  shippingLoading: boolean;
  shippingQuote: {
    cents: number;
    label: string;
    etaDaysMin: number;
    etaDaysMax: number;
  } | null;
  couponFreeShipping: boolean;
  totalCents: number;
  appliedPromoCodes: string[];
  hasMonthlyKit: boolean;
}

export default function StoreCheckoutTotals({
  originalSubtotalCents,
  hasPromoDiscount,
  discountedSubtotalCents,
  couponDiscountCents,
  couponCode,
  couponSummary,
  shippingMode,
  shippingCents,
  shippingLoading,
  shippingQuote,
  couponFreeShipping,
  totalCents,
  appliedPromoCodes,
  hasMonthlyKit,
}: Props) {
  return (
    <div className="space-y-3">
      {hasPromoDiscount ? (
        <div className="flex justify-between text-sm text-stone-500">
          <span>Subtotal sem cupom</span>
          <span className="line-through">{formatMoney(originalSubtotalCents)}</span>
        </div>
      ) : null}
      <div className="flex justify-between text-sm">
        <span className="text-stone-500">Subtotal</span>
        <span className="font-display text-lg text-white">
          {formatMoney(discountedSubtotalCents)}
        </span>
      </div>
      {couponDiscountCents > 0 ? (
        <div className="flex justify-between text-sm text-emerald-400/90">
          <span>Cupom {couponCode}</span>
          <span>-{formatMoney(couponDiscountCents)}</span>
        </div>
      ) : null}
      {shippingMode === 'standalone' ? (
        <div className="flex justify-between text-sm">
          <span className="text-stone-500">Frete</span>
          <span className="text-white">
            {couponFreeShipping ? (
              <>
                <span className="text-stone-600 line-through">
                  {shippingQuote ? formatMoney(shippingQuote.cents) : '—'}
                </span>{' '}
                Grátis
              </>
            ) : shippingLoading ? (
              'Calculando…'
            ) : shippingQuote ? (
              formatMoney(shippingQuote.cents)
            ) : (
              '—'
            )}
          </span>
        </div>
      ) : null}
      <div className="flex justify-between border-t border-white/[0.06] pt-4 text-sm">
        <span className="text-stone-500">Total</span>
        <span className="font-display text-xl text-ember">{formatMoney(totalCents)}</span>
      </div>
      {appliedPromoCodes.length > 0 ? (
        <p className="text-xs text-gold/80">
          Cupom da assinatura aplicado: {appliedPromoCodes.join(', ')}
        </p>
      ) : null}
      {couponCode && couponSummary ? (
        <p className="text-xs text-emerald-400/90">
          Cupom da loja: {couponCode} — {couponSummary}
        </p>
      ) : null}
      <p className="text-xs leading-relaxed text-stone-600">
        {hasMonthlyKit || shippingMode === 'with_subscription'
          ? 'Frete grátis — enviado com a próxima caixa da assinatura.'
          : shippingQuote
            ? `${shippingQuote.label}. Entrega em ${shippingQuote.etaDaysMin}–${shippingQuote.etaDaysMax} dias úteis.`
            : 'Frete calculado conforme região do endereço.'}
      </p>
    </div>
  );
}
