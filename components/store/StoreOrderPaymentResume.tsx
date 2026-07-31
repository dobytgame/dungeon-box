'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import ShopCard from '@/components/shop/ShopCard';
import StorePixPaymentPanel, {
  type StorePixDetails,
} from '@/components/store/StorePixPaymentPanel';
import { formatMoney } from '@/lib/dashboard/format';
import { STORE_ROUTES } from '@/lib/store/routes';

interface Props {
  orderId: string;
}

type OrderStatusPayload = {
  state?: 'approved' | 'pending' | 'not_found';
  pix?: StorePixDetails | null;
  error?: string;
};

export default function StoreOrderPaymentResume({ orderId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<OrderStatusPayload | null>(null);
  const [amountCents, setAmountCents] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(
          `/api/store/checkout/status?orderId=${encodeURIComponent(orderId)}`,
          { cache: 'no-store' }
        );
        const data = (await res.json()) as OrderStatusPayload & {
          order?: { value?: number };
          amountCents?: number | null;
        };

        if (cancelled) return;

        if (!res.ok) {
          setPayload({ state: 'not_found', error: data.error ?? 'Pedido não encontrado.' });
          return;
        }

        setPayload(data);
        if (typeof data.amountCents === 'number') {
          setAmountCents(data.amountCents);
        } else if (typeof data.order?.value === 'number') {
          setAmountCents(Math.round(data.order.value * 100));
        }
      } catch {
        if (!cancelled) {
          setPayload({
            state: 'not_found',
            error: 'Não foi possível carregar o pedido.',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-stone-400">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Carregando pedido…
      </div>
    );
  }

  if (payload?.state === 'approved') {
    return (
      <ShopCard title="Pagamento confirmado" eyebrow="Pedido">
        <p className="text-sm text-stone-300">
          Este pedido já foi pago. Você pode acompanhar os detalhes em Pagamentos.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            href="/dashboard/payments"
            className="inline-flex min-h-[44px] items-center rounded-sm bg-ember px-5 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
          >
            Ver pagamentos
          </Link>
          <Link
            href={STORE_ROUTES.home}
            className="inline-flex min-h-[44px] items-center font-display text-xs uppercase tracking-widest text-ember hover:text-ember/80"
          >
            Voltar à loja
          </Link>
        </div>
      </ShopCard>
    );
  }

  if (payload?.state === 'not_found' || !payload) {
    return (
      <ShopCard title="Pedido não encontrado" eyebrow="Loja">
        <p className="text-sm text-stone-400">
          {payload?.error ??
            'Não encontramos este pedido na sua conta. Verifique o link ou tente novamente pelo carrinho.'}
        </p>
        <Link
          href={STORE_ROUTES.cart}
          className="mt-6 inline-flex font-display text-xs uppercase tracking-widest text-ember hover:text-ember-bright"
        >
          Ir ao carrinho →
        </Link>
      </ShopCard>
    );
  }

  if (payload.pix && amountCents != null) {
    return (
      <ShopCard title="Concluir pagamento" eyebrow="Pedido pendente">
        <p className="text-sm text-stone-400">
          Pedido registrado. Finalize o pagamento via PIX para confirmar a compra.
        </p>
        <p className="mt-2 font-display text-2xl text-white">
          {formatMoney(amountCents)}
        </p>
        <div className="mt-6">
          <StorePixPaymentPanel
            orderId={orderId}
            amountCents={amountCents}
            pix={payload.pix}
            onConfirmed={() => {
              router.push(STORE_ROUTES.success(orderId));
              router.refresh();
            }}
          />
        </div>
      </ShopCard>
    );
  }

  return (
    <ShopCard title="Pagamento pendente" eyebrow="Pedido">
      <p className="text-sm text-stone-300">
        Seu pedido foi registrado, mas o pagamento ainda não foi concluído.
        {payload.state === 'pending'
          ? ' Se escolheu cartão, aguarde a análise ou tente novamente pelo checkout.'
          : ''}
      </p>
      <p className="mt-2 font-mono text-xs text-stone-500">Referência: {orderId}</p>
      <div className="mt-6 flex flex-wrap gap-4">
        <Link
          href={STORE_ROUTES.checkout}
          className="inline-flex min-h-[44px] items-center rounded-sm bg-ember px-5 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
        >
          Voltar ao checkout
        </Link>
        <Link
          href="/dashboard/payments"
          className="inline-flex min-h-[44px] items-center font-display text-xs uppercase tracking-widest text-ember hover:text-ember/80"
        >
          Ver em pagamentos
        </Link>
      </div>
    </ShopCard>
  );
}
