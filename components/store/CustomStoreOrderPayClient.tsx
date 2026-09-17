'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import AsaasPaymentForm, {
  type AsaasCardPayload,
} from '@/components/checkout/AsaasPaymentForm';
import PagarmePaymentForm, {
  type PagarmeTokenResult,
} from '@/components/checkout/PagarmePaymentForm';
import ShopCard from '@/components/shop/ShopCard';
import StorePixPaymentPanel, {
  type StorePixDetails,
} from '@/components/store/StorePixPaymentPanel';
import { formatMoney } from '@/lib/dashboard/format';
import type { StorePaymentConfig } from '@/lib/store/payment-config';
import { STORE_ROUTES } from '@/lib/store/routes';
import type { CustomStoreOrderPublicView } from '@/lib/store/custom-order';

interface Props {
  token: string;
  order: CustomStoreOrderPublicView;
  paymentConfig: StorePaymentConfig;
}

type PaymentMethod = 'credit_card' | 'pix';

export default function CustomStoreOrderPayClient({
  token,
  order,
  paymentConfig,
}: Props) {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('credit_card');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [pix, setPix] = useState<StorePixDetails | null>(null);
  const [awaitingReview, setAwaitingReview] = useState(false);

  const statusUrl = `/api/store/custom-order/status?token=${encodeURIComponent(token)}`;
  const storeProvider = paymentConfig.provider;

  async function pay(payload: {
    paymentMethod: PaymentMethod;
    cardToken?: string;
    creditCard?: AsaasCardPayload;
  }) {
    setPending(true);
    setError('');
    try {
      const res = await fetch('/api/store/custom-order/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          paymentMethod: payload.paymentMethod,
          ...(payload.cardToken ? { cardToken: payload.cardToken } : {}),
          ...(payload.creditCard ? { creditCard: payload.creditCard } : {}),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        success?: boolean;
        pending?: boolean;
        orderId?: string;
        pix?: StorePixDetails;
        awaitingReview?: boolean;
      };

      if (!res.ok) {
        setError(data.error ?? 'Não foi possível processar o pagamento.');
        return;
      }

      if (data.success && data.orderId) {
        router.push(STORE_ROUTES.success(data.orderId));
        router.refresh();
        return;
      }

      if (data.awaitingReview) {
        setAwaitingReview(true);
        return;
      }

      if (data.pending && data.pix) {
        setPix(data.pix);
      }
    } catch {
      setError('Falha de conexão. Tente novamente.');
    } finally {
      setPending(false);
    }
  }

  if (order.state === 'approved') {
    return (
      <ShopCard title="Pagamento confirmado" eyebrow="Pedido personalizado">
        <p className="text-sm text-stone-300">
          Este pedido já foi pago. A produção entra na fila da loja.
        </p>
      </ShopCard>
    );
  }

  if (awaitingReview) {
    return (
      <ShopCard title="Pagamento em análise" eyebrow="Pedido personalizado">
        <p className="text-sm text-stone-300">
          Recebemos o pagamento e estamos aguardando a confirmação da
          operadora. Você receberá um e-mail quando o pedido for aprovado.
        </p>
      </ShopCard>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <ShopCard title="Seu pedido" eyebrow="Pedido personalizado">
        <ul className="space-y-3 text-sm">
          {order.items.map((item) => (
            <li
              key={`${item.name}-${item.quantity}-${item.lineTotalCents}`}
              className="flex items-start justify-between gap-4 border-b border-white/5 pb-3 last:border-0 last:pb-0"
            >
              <span className="text-stone-200">
                {item.quantity > 1 ? `${item.quantity}× ` : ''}
                {item.name}
              </span>
              <span className="tabular-nums text-white">
                {formatMoney(item.lineTotalCents)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex items-center justify-between text-sm">
          <span className="text-stone-500">
            {order.shippingLabel ?? 'Frete incluso'}
            {order.addressSummary ? ` · ${order.addressSummary}` : ''}
          </span>
          <span className="font-display text-2xl text-white">
            {formatMoney(order.amountCents)}
          </span>
        </div>
        {order.notes ? (
          <p className="mt-4 text-sm text-stone-400">{order.notes}</p>
        ) : null}
      </ShopCard>

      <ShopCard title="Pagamento" eyebrow="PIX ou cartão">
        {!paymentConfig.ready ? (
          <p className="text-sm text-amber-200">
            {paymentConfig.issue ??
              'Pagamentos temporariamente indisponíveis.'}
          </p>
        ) : pix ? (
          <StorePixPaymentPanel
            orderId={order.orderId}
            amountCents={order.amountCents}
            pix={pix}
            statusUrl={statusUrl}
            onConfirmed={() => {
              router.push(STORE_ROUTES.success(order.orderId));
              router.refresh();
            }}
          />
        ) : (
          <>
            <div className="mb-5 flex gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('credit_card')}
                className={`flex-1 cursor-pointer rounded-sm border px-4 py-3 font-display text-[10px] uppercase tracking-widest transition ${
                  paymentMethod === 'credit_card'
                    ? 'border-ember/40 bg-ember/10 text-ember'
                    : 'border-white/[0.08] text-stone-400 hover:border-white/15'
                }`}
              >
                Cartão
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`flex-1 cursor-pointer rounded-sm border px-4 py-3 font-display text-[10px] uppercase tracking-widest transition ${
                  paymentMethod === 'pix'
                    ? 'border-ember/40 bg-ember/10 text-ember'
                    : 'border-white/[0.08] text-stone-400 hover:border-white/15'
                }`}
              >
                PIX
              </button>
            </div>

            {paymentMethod === 'credit_card' ? (
              storeProvider === 'pagarme' ? (
                <PagarmePaymentForm
                  disabled={pending}
                  submitLabel="Pagar com cartão"
                  onError={setError}
                  onSubmit={async (card: PagarmeTokenResult) => {
                    await pay({
                      paymentMethod: 'credit_card',
                      cardToken: card.token,
                    });
                  }}
                />
              ) : (
                <AsaasPaymentForm
                  disabled={pending}
                  submitLabel="Pagar com cartão"
                  onError={setError}
                  onSubmit={async (card: AsaasCardPayload) => {
                    await pay({
                      paymentMethod: 'credit_card',
                      creditCard: card,
                    });
                  }}
                />
              )
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-stone-400">
                  Gere o QR Code PIX e pague pelo app do seu banco. A
                  confirmação é automática.
                </p>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void pay({ paymentMethod: 'pix' })}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-sm bg-ember px-5 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? (
                    <>
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                      Gerando PIX…
                    </>
                  ) : (
                    'Gerar PIX'
                  )}
                </button>
              </div>
            )}

            {error ? (
              <p className="mt-4 text-sm text-red-300" role="alert">
                {error}
              </p>
            ) : null}
          </>
        )}
      </ShopCard>
    </div>
  );
}
