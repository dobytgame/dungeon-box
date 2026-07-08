'use client';

import { useCallback, useState } from 'react';
import { Tag, X } from 'lucide-react';
import { CHECKOUT_COUPONS_ENABLED } from '@/lib/checkout/public';
import type { ComboUpgradeOptionPricing } from '@/lib/subscriptions/combo-upgrade';

export type ComboUpgradeCouponApplyResult = {
  code: string;
  summary: string;
  options: ComboUpgradeOptionPricing[];
};

interface Props {
  subscriptionId: string;
  couponCode: string | null;
  couponSummary: string | null;
  onApply: (result: ComboUpgradeCouponApplyResult) => void;
  onRemove: () => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

export default function ComboUpgradeCouponField({
  subscriptionId,
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
      const res = await fetch('/api/subscriptions/combo-upgrade/coupon/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, code }),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok || !payload.valid || !payload.options?.length) {
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
        options: payload.options as ComboUpgradeOptionPricing[],
      });
      setCouponInput(payload.code ?? code);
    } catch (err) {
      onRemove();
      onError(err instanceof Error ? err.message : 'Cupom inválido.');
    } finally {
      setCouponLoading(false);
    }
  }, [couponInput, onApply, onError, onRemove, subscriptionId]);

  if (!CHECKOUT_COUPONS_ENABLED) return null;

  return (
    <div className="rounded-sm border border-white/[0.06] bg-stone-950/30 p-4">
      {!showCoupon && !couponCode ? (
        <button
          type="button"
          onClick={() => setShowCoupon(true)}
          disabled={disabled}
          className="flex cursor-pointer items-center gap-2 text-sm text-stone-400 transition-colors hover:text-gold disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Tag className="h-4 w-4" aria-hidden="true" />
          Tem um cupom para o combo?
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-medium text-white">
              <Tag className="h-4 w-4 text-gold" aria-hidden="true" />
              Cupom do combo
            </p>
            {couponCode ? (
              <button
                type="button"
                onClick={() => {
                  setCouponInput('');
                  onRemove();
                }}
                disabled={disabled || couponLoading}
                className="flex cursor-pointer items-center gap-1 text-xs text-stone-500 transition-colors hover:text-stone-300 disabled:opacity-50"
              >
                <X className="h-3 w-3" aria-hidden="true" />
                Remover
              </button>
            ) : null}
          </div>

          <p className="text-xs text-stone-500">
            O cupom da assinatura mensal não entra aqui — só o desconto do combo
            e, se quiser, um cupom extra para esta migração.
          </p>

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
                className="min-w-0 flex-1 rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white placeholder:text-stone-600 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30 disabled:opacity-50"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => void handleApplyCoupon()}
                disabled={
                  disabled || couponLoading || !couponInput.trim()
                }
                className="cursor-pointer rounded-sm border border-white/15 px-4 py-2.5 font-display text-xs uppercase tracking-widest text-stone-300 transition-colors hover:border-gold/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
