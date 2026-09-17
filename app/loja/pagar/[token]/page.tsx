import type { Metadata } from 'next';
import CustomStoreOrderPayClient from '@/components/store/CustomStoreOrderPayClient';
import { getCustomStoreOrderByToken } from '@/lib/store/custom-order';
import { getStorePaymentConfig } from '@/lib/store/payment-config';
import { buildRobots } from '@/lib/seo/metadata';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: 'Pagar pedido | DungeonBox',
  robots: buildRobots(false),
};

export default async function CustomStoreOrderPayPage({ params }: Props) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken ?? '').trim();
  const [order, paymentConfig] = await Promise.all([
    token
      ? getCustomStoreOrderByToken(token)
      : Promise.resolve({ error: 'Link inválido.', status: 400 as const }),
    getStorePaymentConfig(),
  ]);

  if ('error' in order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <p className="text-sm text-stone-400">{order.error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="font-display text-xs uppercase tracking-[0.25em] text-stone-500">
          Loja
        </p>
        <h1 className="mt-2 font-display text-2xl uppercase tracking-wide text-white">
          Pagar pedido
        </h1>
      </div>
      <CustomStoreOrderPayClient
        token={token}
        order={order}
        paymentConfig={paymentConfig}
      />
    </div>
  );
}
