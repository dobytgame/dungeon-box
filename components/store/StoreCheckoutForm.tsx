'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import AsaasPaymentForm, {
  type AsaasCardPayload,
} from '@/components/checkout/AsaasPaymentForm';
import DashboardCard from '@/components/dashboard/DashboardCard';
import { useStoreCart } from '@/components/store/StoreCartProvider';
import { useStoreCatalog } from '@/components/store/StoreCatalogProvider';
import { formatMoney, formatZip, relOne } from '@/lib/dashboard/format';
import type { Address, Subscription } from '@/lib/dashboard/types';
import { subscriptionEligibleForPaintKitAddon } from '@/lib/subscriptions/paint-kit-addon-shared';
import { subscriptionEligibleForMonthlyKit } from '@/lib/store/monthly-kits';
import {
  cartHasMonthlyKits,
  normalizeCartLines,
  resolveCartLines,
} from '@/lib/store/cart';
import { getStoreProduct } from '@/lib/store/catalog';

interface Props {
  addresses: Address[];
  subscriptions: Subscription[];
}

export default function StoreCheckoutForm({ addresses, subscriptions }: Props) {
  const router = useRouter();
  const { allProducts } = useStoreCatalog();
  const { lines, subtotalCents, clearCart, hydrated } = useStoreCart();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [addressId, setAddressId] = useState(addresses[0]?.id ?? '');

  const eligibleMonthlyKitSubs = useMemo(
    () => subscriptions.filter(subscriptionEligibleForMonthlyKit),
    [subscriptions]
  );

  const [monthlyKitBundleSubscriptionId, setMonthlyKitBundleSubscriptionId] =
    useState(eligibleMonthlyKitSubs[0]?.id ?? '');

  const [paintKitBundleSubscriptionId, setPaintKitBundleSubscriptionId] =
    useState('');

  useEffect(() => {
    if (
      eligibleMonthlyKitSubs.length > 0 &&
      !eligibleMonthlyKitSubs.some(
        (sub) => sub.id === monthlyKitBundleSubscriptionId
      )
    ) {
      setMonthlyKitBundleSubscriptionId(eligibleMonthlyKitSubs[0]!.id);
    }
  }, [eligibleMonthlyKitSubs, monthlyKitBundleSubscriptionId]);

  const resolved = resolveCartLines(lines, allProducts);
  const hasMonthlyKit = cartHasMonthlyKits(lines, allProducts);
  const eligiblePaintKitSubs = subscriptions.filter(
    subscriptionEligibleForPaintKitAddon
  );

  const canBundlePaintKit = useMemo(() => {
    if (hasMonthlyKit) return false;
    const normalized = normalizeCartLines(lines, allProducts);
    if (normalized.length !== 1 || normalized[0]?.quantity !== 1) return false;
    const product = getStoreProduct(normalized[0].productId);
    return Boolean(product?.paintKitBumpId);
  }, [lines, allProducts, hasMonthlyKit]);

  const shippingMode =
    hasMonthlyKit ||
    (paintKitBundleSubscriptionId && canBundlePaintKit)
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
    if (hasMonthlyKit && !monthlyKitBundleSubscriptionId) {
      setError('Selecione com qual assinatura enviar os kits do mês.');
      return;
    }

    if (!hasMonthlyKit && !addressId) {
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
            addressId: addressId || addresses[0]?.id,
            bundleSubscriptionId: hasMonthlyKit
              ? monthlyKitBundleSubscriptionId
              : canBundlePaintKit && paintKitBundleSubscriptionId
                ? paintKitBundleSubscriptionId
                : null,
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

  const selectedMonthlySub = subscriptions.find(
    (sub) => sub.id === monthlyKitBundleSubscriptionId
  );

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        {hasMonthlyKit ? (
          <DashboardCard
            title="Envio com sua assinatura"
            accent="gold"
            description="Escolha a assinatura cujo próximo envio receberá os kits extras — sem frete."
          >
            {eligibleMonthlyKitSubs.length === 0 ? (
              <p className="text-sm text-stone-400">
                Nenhuma assinatura ativa encontrada.
              </p>
            ) : (
              <div className="space-y-3">
                {eligibleMonthlyKitSubs.map((subscription) => {
                  const plan = relOne(subscription.plans);
                  return (
                    <label
                      key={subscription.id}
                      className={`flex cursor-pointer gap-3 rounded-sm border p-4 transition ${
                        monthlyKitBundleSubscriptionId === subscription.id
                          ? 'border-gold/40 bg-gold/5'
                          : 'border-white/[0.06] hover:border-white/15'
                      }`}
                    >
                      <input
                        type="radio"
                        name="monthly-kit-bundle"
                        checked={monthlyKitBundleSubscriptionId === subscription.id}
                        onChange={() =>
                          setMonthlyKitBundleSubscriptionId(subscription.id)
                        }
                        className="mt-1"
                      />
                      <span className="text-sm text-stone-300">
                        <span className="text-white">
                          Próxima caixa — {plan?.name ?? 'Assinatura'}
                        </span>
                        <span className="mt-0.5 block text-xs text-gold">
                          Frete grátis · kits extras vão neste envio
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            <ul className="mt-4 space-y-2 border-t border-white/[0.06] pt-4 text-sm text-stone-400">
              {resolved
                .filter((line) => line.category === 'monthly-kit')
                .map((line) => (
                  <li key={line.productId}>
                    {line.quantity}x {line.name}
                  </li>
                ))}
            </ul>

            {selectedMonthlySub ? (
              <p className="mt-3 text-xs text-stone-500">
                Os kits podem ser de qualquer plano — o envio usa o endereço da
                assinatura {relOne(selectedMonthlySub.plans)?.name ?? 'selecionada'}.
              </p>
            ) : null}
          </DashboardCard>
        ) : (
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
        )}

        {canBundlePaintKit && eligiblePaintKitSubs.length > 0 ? (
          <DashboardCard
            title="Envio com sua assinatura"
            accent="gold"
            description="Frete grátis: o kit vai junto com a próxima dungeon."
          >
            <div className="space-y-3">
              <label className="flex cursor-pointer gap-3 rounded-sm border border-white/[0.06] p-4">
                <input
                  type="radio"
                  name="paint-kit-bundle"
                  checked={!paintKitBundleSubscriptionId}
                  onChange={() => setPaintKitBundleSubscriptionId('')}
                  className="mt-1"
                />
                <span className="text-sm text-stone-300">
                  <span className="text-white">Envio avulso</span>
                  <span className="mt-0.5 block text-xs text-stone-500">
                    Enviaremos para o endereço selecionado em pedido separado.
                  </span>
                </span>
              </label>

              {eligiblePaintKitSubs.map((subscription) => {
                const plan = relOne(subscription.plans);
                return (
                  <label
                    key={subscription.id}
                    className={`flex cursor-pointer gap-3 rounded-sm border p-4 transition ${
                      paintKitBundleSubscriptionId === subscription.id
                        ? 'border-gold/40 bg-gold/5'
                        : 'border-white/[0.06] hover:border-white/15'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paint-kit-bundle"
                      checked={paintKitBundleSubscriptionId === subscription.id}
                      onChange={() =>
                        setPaintKitBundleSubscriptionId(subscription.id)
                      }
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
            disabled={
              pending ||
              (!hasMonthlyKit && addresses.length === 0) ||
              (hasMonthlyKit && eligibleMonthlyKitSubs.length === 0)
            }
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
              {hasMonthlyKit || shippingMode === 'with_subscription'
                ? 'Frete grátis — enviado com a próxima caixa da assinatura.'
                : 'Frete calculado conforme política de envio avulso.'}
            </p>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}
