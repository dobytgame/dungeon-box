'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Loader2 } from 'lucide-react';
import AsaasPaymentForm, {
  type AsaasCardPayload,
} from '@/components/checkout/AsaasPaymentForm';
import DashboardCard from '@/components/dashboard/DashboardCard';
import CheckoutStepper from '@/components/shop/CheckoutStepper';
import StorePixPaymentPanel, {
  type StorePixDetails,
} from '@/components/store/StorePixPaymentPanel';
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
  type CartLine,
} from '@/lib/store/cart';
import { getStoreProduct } from '@/lib/store/catalog';
import {
  storeProductToAnalyticsItem,
  trackStoreAddPaymentInfo,
  trackStoreAddShippingInfo,
  trackStoreBeginCheckout,
} from '@/lib/analytics/store-events';
import { STORE_ROUTES } from '@/lib/store/routes';

interface Props {
  addresses: Address[];
  subscriptions: Subscription[];
  embedded?: boolean;
}

type StorePaymentMethod = 'credit_card' | 'pix';

function buildCheckoutPayload(
  paymentMethod: StorePaymentMethod,
  lines: CartLine[],
  checkoutAddressId: string,
  bundleSubscriptionId: string | null,
  card?: AsaasCardPayload
) {
  return {
    paymentMethod,
    items: lines,
    addressId: checkoutAddressId,
    bundleSubscriptionId,
    ...(paymentMethod === 'credit_card' && card ? { creditCard: card } : {}),
  };
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

  const [paymentMethod, setPaymentMethod] =
    useState<StorePaymentMethod>('credit_card');
  const [pixCheckout, setPixCheckout] = useState<{
    orderId: string;
    pix: StorePixDetails;
  } | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [shippingQuote, setShippingQuote] = useState<{
    cents: number;
    label: string;
    etaDaysMin: number;
    etaDaysMax: number;
  } | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const checkoutTrackedRef = useRef(false);

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
  const appliedPromoCodes = Array.from(
    new Set(
      resolved
        .map((line) => line.promoCode)
        .filter((code): code is string => Boolean(code))
    )
  );
  const originalSubtotalCents = resolved.reduce(
    (sum, line) =>
      sum + (line.originalPriceCents ?? line.priceCents) * line.quantity,
    0
  );
  const hasPromoDiscount = originalSubtotalCents > subtotalCents;
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

  const selectedMonthlySub = subscriptions.find(
    (sub) => sub.id === monthlyKitBundleSubscriptionId
  );
  const checkoutAddressId =
    hasMonthlyKit && selectedMonthlySub?.address_id
      ? selectedMonthlySub.address_id
      : addressId || addresses[0]?.id || '';

  const analyticsItems = useMemo(
    () =>
      resolved.map((line) => {
        const product = getStoreProduct(line.productId);
        return storeProductToAnalyticsItem(
          product ?? {
            id: line.productId,
            name: line.name,
            priceCents: line.priceCents,
            category: line.category ?? 'paint-kit',
          },
          line.quantity
        );
      }),
    [resolved]
  );

  const shippingCents =
    shippingMode === 'standalone' ? (shippingQuote?.cents ?? 0) : 0;
  const totalCents = subtotalCents + shippingCents;

  useEffect(() => {
    if (!hydrated || resolved.length === 0 || checkoutTrackedRef.current) return;
    checkoutTrackedRef.current = true;
    trackStoreBeginCheckout(analyticsItems, subtotalCents / 100);
  }, [hydrated, resolved.length, analyticsItems, subtotalCents]);

  useEffect(() => {
    if (shippingMode !== 'standalone' || !checkoutAddressId) {
      setShippingQuote(null);
      return;
    }

    let cancelled = false;
    setShippingLoading(true);

    void fetch('/api/store/shipping/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ addressId: checkoutAddressId }),
    })
      .then((response) => response.json())
      .then((data: { cents?: number; label?: string; etaDaysMin?: number; etaDaysMax?: number; error?: string }) => {
        if (cancelled) return;
        if (typeof data.cents === 'number' && data.label) {
          setShippingQuote({
            cents: data.cents,
            label: data.label,
            etaDaysMin: data.etaDaysMin ?? 10,
            etaDaysMax: data.etaDaysMax ?? 15,
          });
        } else {
          setShippingQuote(null);
        }
      })
      .catch(() => {
        if (!cancelled) setShippingQuote(null);
      })
      .finally(() => {
        if (!cancelled) setShippingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shippingMode, checkoutAddressId]);

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
          href={STORE_ROUTES.home}
          className="mt-4 inline-flex font-display text-xs uppercase tracking-widest text-ember hover:text-ember-bright"
        >
          Voltar à loja →
        </Link>
      </DashboardCard>
    );
  }

  function goToDeliveryStep() {
    setStep(2);
    trackStoreAddShippingInfo(analyticsItems, totalCents / 100);
  }

  function goToPaymentStep() {
    if (hasMonthlyKit && !monthlyKitBundleSubscriptionId) {
      setError('Selecione com qual assinatura enviar os kits do mês.');
      return;
    }
    if (!hasMonthlyKit && !checkoutAddressId) {
      setError('Selecione um endereço de entrega.');
      return;
    }
    if (shippingMode === 'standalone' && !shippingQuote && !shippingLoading) {
      setError('Não foi possível calcular o frete para o endereço selecionado.');
      return;
    }
    setError('');
    setStep(3);
    trackStoreAddPaymentInfo(analyticsItems, totalCents / 100);
  }

  async function submitCheckout(
    method: StorePaymentMethod,
    card?: AsaasCardPayload
  ) {
    if (hasMonthlyKit && !monthlyKitBundleSubscriptionId) {
      setError('Selecione com qual assinatura enviar os kits do mês.');
      return;
    }

    if (!hasMonthlyKit && !checkoutAddressId) {
      setError('Selecione um endereço de entrega.');
      return;
    }

    if (hasMonthlyKit && !checkoutAddressId) {
      setError(
        'Sua assinatura não possui endereço de entrega. Atualize em Minha assinatura.'
      );
      return;
    }

    setError('');
    startTransition(async () => {
      try {
        const res = await fetch('/api/store/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            buildCheckoutPayload(
              method,
              lines,
              checkoutAddressId,
              hasMonthlyKit
                ? monthlyKitBundleSubscriptionId
                : canBundlePaintKit && paintKitBundleSubscriptionId
                  ? paintKitBundleSubscriptionId
                  : null,
              card
            )
          ),
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

        if (payload.pending && payload.pix && payload.orderId) {
          setPixCheckout({
            orderId: payload.orderId,
            pix: payload.pix as StorePixDetails,
          });
          return;
        }

        clearCart();
        const orderId =
          typeof payload.orderId === 'string' ? payload.orderId : 'ok';
        router.push(STORE_ROUTES.success(orderId));
        router.refresh();
      } catch {
        setError('Erro de conexão. Tente novamente.');
      }
    });
  }

  async function handlePay(card: AsaasCardPayload) {
    await submitCheckout('credit_card', card);
  }

  async function handlePixPay() {
    await submitCheckout('pix');
  }

  function handlePixConfirmed() {
    clearCart();
    if (pixCheckout?.orderId) {
      router.push(STORE_ROUTES.success(pixCheckout.orderId));
      router.refresh();
    }
  }

  return (
    <div>
      <CheckoutStepper currentStep={step} />
      <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        {step === 1 ? (
          <DashboardCard title="Resumo do pedido" accent="gold">
            <ul className="space-y-3 text-sm text-stone-400">
              {resolved.map((line) => (
                <li key={line.productId} className="flex justify-between gap-3">
                  <span>
                    {line.quantity}x {line.name}
                  </span>
                  <span className="text-white">
                    {formatMoney(line.lineTotalCents)}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={goToDeliveryStep}
              className="mt-6 inline-flex min-h-[44px] cursor-pointer items-center rounded-sm bg-ember px-6 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
            >
              Continuar para entrega →
            </button>
          </DashboardCard>
        ) : null}

        {step === 2 ? (
          <>
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

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-sm border border-white/10 px-5 py-3 font-display text-xs uppercase tracking-widest text-stone-400"
          >
            ← Voltar
          </button>
          <button
            type="button"
            onClick={goToPaymentStep}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-sm bg-ember px-6 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
          >
            Continuar para pagamento →
          </button>
        </div>
          </>
        ) : null}

        {step === 3 ? (
        <>
        <button
          type="button"
          onClick={() => setStep(2)}
          className="mb-4 inline-flex min-h-[40px] cursor-pointer items-center font-display text-xs uppercase tracking-widest text-stone-500 hover:text-white"
        >
          ← Voltar para entrega
        </button>
        <DashboardCard title="Pagamento" accent="ember">
          {pixCheckout ? (
            <StorePixPaymentPanel
              orderId={pixCheckout.orderId}
              amountCents={totalCents}
              pix={pixCheckout.pix}
              onConfirmed={handlePixConfirmed}
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
                <AsaasPaymentForm
                  disabled={
                    pending ||
                    (!hasMonthlyKit && addresses.length === 0) ||
                    (hasMonthlyKit && eligibleMonthlyKitSubs.length === 0)
                  }
                  submitLabel="Pagar com cartão"
                  onError={setError}
                  onSubmit={handlePay}
                />
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-stone-400">
                    Gere o QR Code PIX e pague pelo app do seu banco. A confirmação
                    é automática após o pagamento.
                  </p>
                  <button
                    type="button"
                    disabled={
                      pending ||
                      (!hasMonthlyKit && addresses.length === 0) ||
                      (hasMonthlyKit && eligibleMonthlyKitSubs.length === 0)
                    }
                    onClick={() => void handlePixPay()}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-sm bg-ember px-5 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {pending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Gerando PIX…
                      </>
                    ) : (
                      'Gerar PIX'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
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
        </>
        ) : null}
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
            {hasPromoDiscount ? (
              <div className="mb-4 flex justify-between text-sm text-stone-500">
                <span>Subtotal sem cupom</span>
                <span className="line-through">
                  {formatMoney(originalSubtotalCents)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Subtotal</span>
              <span className="font-display text-lg text-white">
                {formatMoney(subtotalCents)}
              </span>
            </div>
            {shippingMode === 'standalone' ? (
              <div className="mt-3 flex justify-between text-sm">
                <span className="text-stone-500">Frete</span>
                <span className="text-white">
                  {shippingLoading
                    ? 'Calculando…'
                    : shippingQuote
                      ? formatMoney(shippingQuote.cents)
                      : '—'}
                </span>
              </div>
            ) : null}
            <div className="mt-4 flex justify-between border-t border-white/[0.06] pt-4 text-sm">
              <span className="text-stone-500">Total</span>
              <span className="font-display text-xl text-ember">
                {formatMoney(totalCents)}
              </span>
            </div>
            {appliedPromoCodes.length > 0 ? (
              <p className="mt-2 text-xs text-gold/80">
                Cupom da assinatura aplicado: {appliedPromoCodes.join(', ')}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-stone-600">
              {hasMonthlyKit || shippingMode === 'with_subscription'
                ? 'Frete grátis — enviado com a próxima caixa da assinatura.'
                : shippingQuote
                  ? `${shippingQuote.label}. Entrega em ${shippingQuote.etaDaysMin}–${shippingQuote.etaDaysMax} dias úteis.`
                  : 'Frete calculado conforme região do endereço.'}
            </p>
          </div>
        </DashboardCard>
      </div>
    </div>
    </div>
  );
}
