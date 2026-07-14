'use client';

import { Loader2 } from 'lucide-react';
import { formatMoney } from '@/lib/dashboard/format';

interface Props {
  step: 2 | 3;
  totalCents: number;
  itemCount: number;
  shippingLoading?: boolean;
  paymentMethod?: 'credit_card' | 'pix';
  pending?: boolean;
  onContinueToPayment?: () => void;
  onPixPay?: () => void;
  onScrollToCardForm?: () => void;
}

export default function StoreCheckoutMobileBar({
  step,
  totalCents,
  itemCount,
  shippingLoading = false,
  paymentMethod = 'credit_card',
  pending = false,
  onContinueToPayment,
  onPixPay,
  onScrollToCardForm,
}: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.08] bg-[#0A0C10]/95 px-4 py-3 pb-safe backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[10px] uppercase tracking-widest text-stone-500">
            {itemCount} {itemCount === 1 ? 'item' : 'itens'}
            {shippingLoading ? ' · calculando frete…' : ''}
          </p>
          <p className="font-display text-xl text-ember">{formatMoney(totalCents)}</p>
        </div>

        {step === 2 ? (
          <button
            type="button"
            onClick={onContinueToPayment}
            disabled={pending || shippingLoading}
            className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center justify-center rounded-sm bg-ember px-4 font-display text-[10px] uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright disabled:cursor-not-allowed disabled:opacity-50"
          >
            Pagamento →
          </button>
        ) : paymentMethod === 'pix' ? (
          <button
            type="button"
            onClick={onPixPay}
            disabled={pending}
            className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center justify-center gap-2 rounded-sm bg-ember px-4 font-display text-[10px] uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Gerando…
              </>
            ) : (
              'Pagar PIX'
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={onScrollToCardForm}
            className="inline-flex min-h-[44px] shrink-0 cursor-pointer items-center justify-center rounded-sm border border-ember/40 bg-ember/10 px-4 font-display text-[10px] uppercase tracking-widest text-ember transition hover:bg-ember/20"
          >
            Ver cartão
          </button>
        )}
      </div>
    </div>
  );
}
