'use client';

import { useCallback, useState } from 'react';
import { Tag, X } from 'lucide-react';
import { STORE_COUPONS_ENABLED } from '@/lib/store/public';

export type StoreCouponApplyResult = {
  code: string;
  summary: string;
  discountedSubtotalCents: number;
  subtotalDiscountCents: number;
  freeShipping: boolean;
};

interface Props {
  subtotalCents: number;
  standaloneShipping: boolean;
  shippingCents: number;
  couponCode: string | null;
  couponSummary: string | null;
  onApply: (result: StoreCouponApplyResult) => void;
  onRemove: () => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

export default function StoreCouponField({
  subtotalCents,
  standaloneShipping,
  shippingCents,
  couponCode,
  couponSummary,
  onApply,
  onRemove,
  onError,
  disabled = false,
}: Props) {
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);

  const handleApplyCoupon = useCallback(async () => {
    const code = couponInput.trim();
    if (!code) {
      onError('Informe o código do cupom.');
      return;
    }

    setCouponLoading(true);
    onError('');

    try {
      const res = await fetch('/api/store/coupon/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          subtotalCents,
          standaloneShipping,
          shippingCents,
        }),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok || !payload.valid) {
        throw new Error(
          typeof payload.error === 'string'
            ? payload.error
            : 'Cupom inválido.'
        );
      }

      onApply({
        code: payload.code ?? code,
        summary:
          typeof payload.summary === 'string'
            ? payload.summary
            : 'Cupom aplicado',
        discountedSubtotalCents: payload.discountedSubtotalCents,
        subtotalDiscountCents: payload.subtotalDiscountCents ?? 0,
        freeShipping: Boolean(payload.freeShipping),
      });
      setCouponInput(payload.code ?? code);
    } catch (err) {
      onRemove();
      onError(err instanceof Error ? err.message : 'Cupom inválido.');
    } finally {
      setCouponLoading(false);
    }
  }, [
    couponInput,
    onApply,
    onError,
    onRemove,
    shippingCents,
    standaloneShipping,
    subtotalCents,
  ]);

  if (!STORE_COUPONS_ENABLED || subtotalCents <= 0) return null;

  return (
    <div className="rounded-sm border border-white/10 bg-mesa-ink/30 p-4">
      {!showCoupon && !couponCode ? (
        <button
          type="button"
          onClick={() => setShowCoupon(true)}
          disabled={disabled}
          className="flex cursor-pointer items-center gap-2 text-sm text-mesa-ash transition-colors hover:text-mesa-jade disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Tag className="h-4 w-4" aria-hidden="true" />
          Tem um cupom de desconto?
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-medium text-mesa-parchment">
              <Tag className="h-4 w-4 text-mesa-jade" aria-hidden="true" />
              Cupom da loja
            </p>
            {couponCode ? (
              <button
                type="button"
                onClick={() => {
                  setCouponInput('');
                  onRemove();
                }}
                disabled={disabled || couponLoading}
                className="flex cursor-pointer items-center gap-1 text-xs text-mesa-ash transition-colors hover:text-mesa-parchment/90 disabled:opacity-50"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                Remover
              </button>
            ) : null}
          </div>

          {couponCode && couponSummary ? (
            <p
              className="rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100/90"
              role="status"
            >
              <span className="font-medium">{couponCode}</span> — {couponSummary}
            </p>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleApplyCoupon();
                  }
                }}
                placeholder="Código do cupom"
                disabled={disabled || couponLoading}
                className="min-w-0 flex-1 rounded-sm border border-white/10 bg-mesa-ink px-3 py-2.5 text-sm text-mesa-parchment placeholder:text-mesa-ash/70 focus:border-mesa-jade/50 focus:outline-none focus:ring-1 focus:ring-mesa-jade/30 disabled:opacity-50"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => void handleApplyCoupon()}
                disabled={
                  disabled || couponLoading || !couponInput.trim()
                }
                className="cursor-pointer rounded-sm border border-white/15 px-4 py-2.5 font-display text-xs uppercase tracking-widest text-mesa-parchment/90 transition-colors hover:border-mesa-jade/40 hover:text-mesa-parchment disabled:cursor-not-allowed disabled:opacity-50"
              >
                {couponLoading ? 'Validando…' : 'Aplicar'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
