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
import StoreCheckoutAddressSection from '@/components/store/StoreCheckoutAddressSection';
import StoreCheckoutLineItems, {
  storeCheckoutItemCount,
} from '@/components/store/StoreCheckoutLineItems';
import StoreCheckoutMobileBar from '@/components/store/StoreCheckoutMobileBar';
import StoreCheckoutTotals from '@/components/store/StoreCheckoutTotals';
import StoreCouponField, {
  type StoreCouponApplyResult,
} from '@/components/store/StoreCouponField';
import StorePixPaymentPanel, {
  type StorePixDetails,
} from '@/components/store/StorePixPaymentPanel';
import { useStoreCart } from '@/components/store/StoreCartProvider';
import { useStoreCatalog } from '@/components/store/StoreCatalogProvider';
import { relOne } from '@/lib/dashboard/format';
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
import type { StorePaymentConfig } from '@/lib/store/payment-config';

interface Props {
  addresses: Address[];
  subscriptions: Subscription[];
  embedded?: boolean;
  paymentConfig?: StorePaymentConfig;
}

type StorePaymentMethod = 'credit_card' | 'pix';

function buildCheckoutPayload(
  paymentMethod: StorePaymentMethod,
  lines: CartLine[],
  checkoutAddressId: string,
  bundleSubscriptionId: string | null,
  couponCode: string | null,
  card?: AsaasCardPayload
) {
  return {
    paymentMethod,
    items: lines,
    addressId: checkoutAddressId,
    bundleSubscriptionId,
    couponCode,
    ...(paymentMethod === 'credit_card' && card ? { creditCard: card } : {}),
  };
}

export default function StoreCheckoutForm({
  addresses,
  subscriptions,
  paymentConfig,
}: Props) {
  const router = useRouter();
  const { allProducts } = useStoreCatalog();
  const { lines, subtotalCents, clearCart, hydrated } = useStoreCart();
  const [checkoutAddresses, setCheckoutAddresses] = useState(addresses);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  const [addressId, setAddressId] = useState(
    () =>
      addresses.find((address) => address.is_default)?.id ?? addresses[0]?.id ?? ''
  );

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
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponSummary, setCouponSummary] = useState<string | null>(null);
  const [couponDiscountCents, setCouponDiscountCents] = useState(0);
  const [couponFreeShipping, setCouponFreeShipping] = useState(false);
  const checkoutTrackedRef = useRef(false);
  const paymentFormRef = useRef<HTMLDivElement>(null);
  const paymentsReady = paymentConfig?.ready ?? true;

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
  const requiresBundledMonthlyKit = useMemo(
    () =>
      resolved.some((line) => {
        if (line.category !== 'monthly-kit') return false;
        const product = allProducts.find((entry) => entry.id === line.productId);
        return product?.requiresSubscriptionBundle ?? false;
      }),
    [resolved, allProducts]
  );
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
    requiresBundledMonthlyKit ||
    (paintKitBundleSubscriptionId && canBundlePaintKit)
      ? 'with_subscription'
      : 'standalone';

  const selectedMonthlySub = subscriptions.find(
    (sub) => sub.id === monthlyKitBundleSubscriptionId
  );
  const checkoutAddressId =
    requiresBundledMonthlyKit && selectedMonthlySub?.address_id
      ? selectedMonthlySub.address_id
      : addressId || checkoutAddresses[0]?.id || '';

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
    shippingMode === 'standalone'
      ? couponFreeShipping
        ? 0
        : (shippingQuote?.cents ?? 0)
      : 0;
  const discountedSubtotalCents = Math.max(0, subtotalCents - couponDiscountCents);
  const totalCents = discountedSubtotalCents + shippingCents;
  const checkoutItemCount = storeCheckoutItemCount(resolved);

  const totalsProps = {
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
  } as const;

  useEffect(() => {
    if (!hydrated || resolved.length === 0 || checkoutTrackedRef.current) return;
    checkoutTrackedRef.current = true;
    trackStoreBeginCheckout(analyticsItems, subtotalCents / 100);
  }, [hydrated, resolved.length, analyticsItems, subtotalCents]);

  useEffect(() => {
    if (!couponCode) return;

    let cancelled = false;

    void fetch('/api/store/coupon/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: couponCode,
        subtotalCents,
        standaloneShipping: shippingMode === 'standalone',
        shippingCents: shippingQuote?.cents ?? 0,
      }),
    })
      .then((response) => response.json())
      .then(
        (payload: StoreCouponApplyResult & { valid?: boolean; error?: string }) => {
          if (cancelled) return;

          if (!payload.valid) {
            handleCouponRemove();
            if (payload.error) {
              setError(payload.error);
            }
            return;
          }

          setCouponDiscountCents(payload.subtotalDiscountCents ?? 0);
          setCouponFreeShipping(Boolean(payload.freeShipping));
          if (payload.summary) {
            setCouponSummary(payload.summary);
          }
        }
      )
      .catch(() => {
        if (!cancelled) handleCouponRemove();
      });

    return () => {
      cancelled = true;
    };
  }, [couponCode, subtotalCents, shippingMode, shippingQuote?.cents]);

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

  function handleCouponApply(result: StoreCouponApplyResult) {
    setCouponCode(result.code);
    setCouponSummary(result.summary);
    setCouponDiscountCents(result.subtotalDiscountCents);
    setCouponFreeShipping(result.freeShipping);
    setError('');
  }

  function handleCouponRemove() {
    setCouponCode(null);
    setCouponSummary(null);
    setCouponDiscountCents(0);
    setCouponFreeShipping(false);
  }

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
    if (!paymentsReady) {
      setError('Pagamentos da loja indisponíveis no momento. Tente novamente mais tarde.');
      return;
    }
    if (requiresBundledMonthlyKit && !monthlyKitBundleSubscriptionId) {
      setError('Selecione com qual assinatura enviar os kits do mês.');
      return;
    }
    if (!requiresBundledMonthlyKit && !checkoutAddressId) {
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
    if (!paymentsReady) {
      setError('Pagamentos da loja indisponíveis no momento.');
      return;
    }
    if (requiresBundledMonthlyKit && !monthlyKitBundleSubscriptionId) {
      setError('Selecione com qual assinatura enviar os kits do mês.');
      return;
    }

    if (!requiresBundledMonthlyKit && !checkoutAddressId) {
      setError('Selecione um endereço de entrega.');
      return;
    }

    if (requiresBundledMonthlyKit && !checkoutAddressId) {
      setError(
        'Sua assinatura não possui endereço de entrega. Atualize em Minha assinatura.'
      );
      return;
    }

    const itemsSnapshot = normalizeCartLines(lines, allProducts);
    if (itemsSnapshot.length === 0) {
      setError('Seu carrinho está vazio.');
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
              itemsSnapshot,
              checkoutAddressId,
              hasMonthlyKit
                ? requiresBundledMonthlyKit
                  ? monthlyKitBundleSubscriptionId
                  : null
                : canBundlePaintKit && paintKitBundleSubscriptionId
                  ? paintKitBundleSubscriptionId
                  : null,
              couponCode,
              card
            )
          ),
        });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          const message =
            typeof payload.error === 'string'
              ? payload.error
              : 'Não foi possível concluir a compra.';
          setError(message);
          throw new Error(message);
        }

        if (payload.pending && payload.orderId) {
          if (payload.pix) {
            setPixCheckout({
              orderId: payload.orderId,
              pix: payload.pix as StorePixDetails,
            });
            return;
          }

          clearCart();
          router.push(STORE_ROUTES.success(payload.orderId));
          router.refresh();
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

  function scrollToPaymentForm() {
    paymentFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className={step >= 2 ? 'pb-28 md:pb-0' : undefined}>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((step - 1) as 1 | 2)}
            className="inline-flex shrink-0 cursor-pointer items-center font-display text-xs uppercase tracking-widest text-stone-500 transition hover:text-white"
          >
            ← {step === 3 ? 'Voltar para entrega' : 'Voltar ao resumo'}
          </button>
        ) : null}
        <CheckoutStepper currentStep={step} className="mb-0 min-w-0 flex-1" />
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        {step === 1 ? (
          <DashboardCard
            title="Resumo do pedido"
            accent="gold"
            description={`${checkoutItemCount} ${
              checkoutItemCount === 1 ? 'item' : 'itens'
            } no carrinho`}
          >
            <StoreCheckoutLineItems lines={resolved} variant="detailed" editable />
            <div className="mt-6 border-t border-white/[0.06] pt-6">
              <StoreCouponField
                subtotalCents={subtotalCents}
                standaloneShipping={shippingMode === 'standalone'}
                shippingCents={shippingQuote?.cents ?? 0}
                couponCode={couponCode}
                couponSummary={couponSummary}
                onApply={handleCouponApply}
                onRemove={handleCouponRemove}
                onError={setError}
                disabled={pending}
              />
            </div>
            <button
              type="button"
              onClick={goToDeliveryStep}
              className="mt-6 inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-sm bg-ember px-6 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright sm:w-auto"
            >
              Continuar para entrega →
            </button>
          </DashboardCard>
        ) : null}

        {step === 2 ? (
          <>
        {requiresBundledMonthlyKit ? (
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
                  <li key={line.lineId}>
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
            <StoreCheckoutAddressSection
              addresses={checkoutAddresses}
              selectedAddressId={addressId}
              onSelectAddress={setAddressId}
              onAddressesChange={setCheckoutAddresses}
              onError={setError}
            />
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
            disabled={!paymentsReady}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-sm bg-ember px-6 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continuar para pagamento →
          </button>
        </div>
          </>
        ) : null}

        {step === 3 ? (
        <div ref={paymentFormRef} id="checkout-payment-form">
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
                    !paymentsReady ||
                    pending ||
                    (!hasMonthlyKit && checkoutAddresses.length === 0) ||
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
                      !paymentsReady ||
                      pending ||
                      (!hasMonthlyKit && checkoutAddresses.length === 0) ||
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
        </div>
        ) : null}
      </div>

      <div className="lg:col-span-2">
        <div className="md:sticky md:top-24 md:z-10">
          <DashboardCard
            title="Resumo"
            accent="none"
            description={
              step === 1
                ? `${checkoutItemCount} ${
                    checkoutItemCount === 1 ? 'produto' : 'produtos'
                  }`
                : undefined
            }
          >
            {step > 1 ? (
              <div className="mb-6">
                <StoreCheckoutLineItems
                  lines={resolved}
                  variant="compact"
                  editable
                />
              </div>
            ) : null}
            <StoreCheckoutTotals {...totalsProps} />
          </DashboardCard>
        </div>
      </div>
    </div>

      {step === 2 || step === 3 ? (
        <StoreCheckoutMobileBar
          step={step}
          totalCents={totalCents}
          itemCount={checkoutItemCount}
          shippingLoading={shippingLoading}
          paymentMethod={paymentMethod}
          pending={pending}
          onContinueToPayment={goToPaymentStep}
          onPixPay={handlePixPay}
          onScrollToCardForm={scrollToPaymentForm}
        />
      ) : null}
    </div>
  );
}
