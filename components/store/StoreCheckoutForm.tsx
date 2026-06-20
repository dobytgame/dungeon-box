'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import AsaasPaymentForm, {
  type AsaasCardPayload,
} from '@/components/checkout/AsaasPaymentForm';
import DashboardCard from '@/components/dashboard/DashboardCard';
import { useStoreCart } from '@/components/store/StoreCartProvider';
import { formatMoney, formatZip, relOne } from '@/lib/dashboard/format';
import type { Address, Subscription } from '@/lib/dashboard/types';
import { subscriptionEligibleForPaintKitAddon } from '@/lib/subscriptions/paint-kit-addon-shared';
import { normalizeCartLines, resolveCartLines } from '@/lib/store/cart';
import { getStoreProduct } from '@/lib/store/catalog';

interface Props {
  addresses: Address[];
  subscriptions: Subscription[];
}

export default function StoreCheckoutForm({ addresses, subscriptions }: Props) {
  const router = useRouter();
  const { lines, subtotalCents, clearCart, hydrated } = useStoreCart();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [addressId, setAddressId] = useState(addresses[0]?.id ?? '');
  const [bundleSubscriptionId, setBundleSubscriptionId] = useState<string>('');

  const resolved = resolveCartLines(lines);
  const eligibleBundleSubs = subscriptions.filter(
    subscriptionEligibleForPaintKitAddon
  );

  const canBundleWithSubscription = useMemo(() => {
    const normalized = normalizeCartLines(lines);
    if (normalized.length !== 1 || normalized[0]?.quantity !== 1) return false;
    const product = getStoreProduct(normalized[0].productId);
    return Boolean(product?.paintKitBumpId);
  }, [lines]);

  const shippingMode =
    bundleSubscriptionId && canBundleWithSubscription
      ? 'with_subscription'
      : 'standalone';

  if (!hydrated) {
    return (
      <DashboardCard title="Checkout" accent="gold">
        <p className="text-sm text-stone-500">Carregando…</p>
      </DashboardCard>
    );
  }

  if (resolved.length === 0) {
    return (
      <DashboardCard title="Checkout" accent="gold">
        <p className="text-sm text-stone-400">Seu carrinho está vazio.</p>
        <Link
          href="/dashboard/loja"
          className="mt-4 inline-flex font-display text-xs uppercase tracking-widest text-ember hover:text-ember-bright"
        >
          Voltar à loja →
        </Link>
      </DashboardCard>
    );
  }

  async function handlePay(card: AsaasCardPayload) {
    if (!addressId) {
      setError('Selecione um endereço de entrega.');
      return;
    }

    setError('');
    startTransition(async () => {
      try {
        const res = await fetch('/api/store/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: lines,
            addressId,
            bundleSubscriptionId:
              shippingMode === 'with_subscription' ? bundleSubscriptionId : null,
            creditCard: card,
          }),
        });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          setError(
            typeof payload.error === 'string'
              ? payload.error
              : 'Não foi possível concluir a compra.'
          );
          return;
        }

        clearCart();
        const orderId =
          typeof payload.orderId === 'string' ? payload.orderId : 'ok';
        router.push(`/dashboard/loja/sucesso?order=${orderId}`);
        router.refresh();
      } catch {
        setError('Erro de conexão. Tente novamente.');
      }
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        <DashboardCard title="Entrega" accent="frost">
          {addresses.length === 0 ? (
            <p className="text-sm text-stone-400">
              Cadastre um endereço em{' '}
              <Link href="/dashboard/addresses" className="text-ember hover:underline">
                Endereços
              </Link>{' '}
              antes de finalizar.
            </p>
          ) : (
            <div className="space-y-3">
              {addresses.map((address) => (
                <label
                  key={address.id}
                  className={`flex cursor-pointer gap-3 rounded-sm border p-4 transition ${
                    addressId === address.id
                      ? 'border-frost/40 bg-frost/5'
                      : 'border-white/[0.06] hover:border-white/15'
                  }`}
                >
                  <input
                    type="radio"
                    name="store-address"
                    checked={addressId === address.id}
                    onChange={() => setAddressId(address.id)}
                    className="mt-1"
                  />
                  <span className="text-sm text-stone-300">
                    <span className="text-white">{address.recipient}</span>
                    <br />
                    {address.street}, {address.number}
                    {address.complement ? ` — ${address.complement}` : ''}
                    <br />
                    {address.neighborhood}, {address.city}/{address.state} ·{' '}
                    {formatZip(address.zip_code)}
                  </span>
                </label>
              ))}
            </div>
          )}
        </DashboardCard>

        {canBundleWithSubscription && eligibleBundleSubs.length > 0 ? (
          <DashboardCard
            title="Envio com sua assinatura"
            accent="gold"
            description="Frete grátis: o kit vai junto com a próxima dungeon."
          >
            <div className="space-y-3">
              <label className="flex cursor-pointer gap-3 rounded-sm border border-white/[0.06] p-4">
                <input
                  type="radio"
                  name="bundle-mode"
                  checked={!bundleSubscriptionId}
                  onChange={() => setBundleSubscriptionId('')}
                  className="mt-1"
                />
                <span className="text-sm text-stone-300">
                  <span className="text-white">Envio avulso</span>
                  <span className="mt-0.5 block text-xs text-stone-500">
                    Enviaremos para o endereço selecionado em pedido separado.
                  </span>
                </span>
              </label>

              {eligibleBundleSubs.map((subscription) => {
                const plan = relOne(subscription.plans);
                return (
                  <label
                    key={subscription.id}
                    className={`flex cursor-pointer gap-3 rounded-sm border p-4 transition ${
                      bundleSubscriptionId === subscription.id
                        ? 'border-gold/40 bg-gold/5'
                        : 'border-white/[0.06] hover:border-white/15'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bundle-mode"
                      checked={bundleSubscriptionId === subscription.id}
                      onChange={() => setBundleSubscriptionId(subscription.id)}
                      className="mt-1"
                    />
                    <span className="text-sm text-stone-300">
                      <span className="text-white">
                        Com a próxima caixa — {plan?.name ?? 'Assinatura'}
                      </span>
                      <span className="mt-0.5 block text-xs text-gold">
                        Frete grátis
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </DashboardCard>
        ) : null}

        <DashboardCard title="Pagamento" accent="ember">
          <AsaasPaymentForm
            disabled={pending || addresses.length === 0}
            onError={setError}
            onSubmit={handlePay}
          />
          {pending ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-stone-400">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Processando pagamento…
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}
        </DashboardCard>
      </div>

      <div className="lg:col-span-2">
        <DashboardCard title="Resumo" accent="none">
          <ul className="space-y-3 text-sm text-stone-400">
            {resolved.map((line) => (
              <li key={line.productId} className="flex justify-between gap-3">
                <span>
                  {line.quantity}x {line.name}
                </span>
                <span className="text-white">{formatMoney(line.lineTotalCents)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 border-t border-white/[0.06] pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Subtotal</span>
              <span className="font-display text-lg text-white">
                {formatMoney(subtotalCents)}
              </span>
            </div>
            <p className="mt-2 text-xs text-stone-600">
              {shippingMode === 'with_subscription'
                ? 'Frete grátis na próxima caixa.'
                : 'Frete calculado conforme política de envio avulso.'}
            </p>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
