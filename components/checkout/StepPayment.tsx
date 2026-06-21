'use client';

import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { CreditCard, Lock, Loader2, ShieldCheck, Tag } from 'lucide-react';
import type { CheckoutData } from '@/lib/checkout/types';
import { sumRecurringCheckoutCents } from '@/lib/checkout/bump-billing';
import type { Profile } from '@/lib/dashboard/types';
import {
  ASAAS_CHECKOUT_READY,
  STRIPE_CHECKOUT_ACTIVE,
} from '@/lib/payments/public';
import {
  buildCheckoutEcommerceItems,
  buildCheckoutEcommerceValue,
} from '@/lib/analytics/checkout-items';
import { trackAddPaymentInfo } from '@/lib/analytics/data-layer';
import {
  calculateComboTotalCents,
  COMBO_BILLING_ENABLED,
  isComboTerm,
} from '@/lib/checkout/combo-billing';
import AsaasPaymentForm, {
  type AsaasCardPayload,
} from './AsaasPaymentForm';
import CheckoutProfileForm from './CheckoutProfileForm';
import CheckoutSection from './CheckoutSection';
import InstallmentSelector from './InstallmentSelector';
import StripeCheckoutProvider from './StripeCheckoutProvider';
import StripePaymentForm from './StripePaymentForm';

interface Props {
  data: CheckoutData;
  setData: Dispatch<SetStateAction<CheckoutData>>;
  profile: Profile | null;
  userEmail: string;
  onProfileSaved: (
    updates: Pick<Profile, 'full_name' | 'phone' | 'cpf'>
  ) => void;
  onBack: () => void;
}

export default function StepPayment({
  data,
  setData,
  profile,
  onProfileSaved,
  onBack,
}: Props) {
  const router = useRouter();
  const primaryPlanSlug = data.planSlugs[0] ?? 'heroi';
  const cpfDigits = profile?.cpf?.replace(/\D/g, '') ?? '';
  const phoneDigits = profile?.phone?.replace(/\D/g, '') ?? '';
  const cpfReady = cpfDigits.length === 11;
  const phoneReady = phoneDigits.length >= 10;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(ASAAS_CHECKOUT_READY ? false : true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutSubscriptionId, setCheckoutSubscriptionId] = useState<
    string | null
  >(null);

  const promotionCode = data.couponCode ?? null;
  const monthlyTotalCents = sumRecurringCheckoutCents(data);
  const comboTerm =
    COMBO_BILLING_ENABLED && isComboTerm(data.billingTerm)
      ? data.billingTerm
      : null;
  const isCombo = comboTerm !== null;
  const comboTotalCents = comboTerm
    ? calculateComboTotalCents(data, comboTerm)
    : 0;
  const stripeSinglePlanOnly = data.planSlugs.length > 1;

  const stripeReady =
    STRIPE_CHECKOUT_ACTIVE &&
    cpfReady &&
    Boolean(data.addressId) &&
    !stripeSinglePlanOnly;
  const asaasReady =
    ASAAS_CHECKOUT_READY &&
    cpfReady &&
    phoneReady &&
    Boolean(data.addressId);
  const paymentConfigured = ASAAS_CHECKOUT_READY || STRIPE_CHECKOUT_ACTIVE;
  const profileIncomplete = !cpfReady || (ASAAS_CHECKOUT_READY && !phoneReady);

  const paymentInfoTracked = useRef(false);

  useEffect(() => {
    if (paymentInfoTracked.current || data.planSlugs.length === 0) return;
    paymentInfoTracked.current = true;

    const items = buildCheckoutEcommerceItems(data);
    trackAddPaymentInfo({
      items,
      value: buildCheckoutEcommerceValue(data),
    });
  }, [data]);

  const prepareCheckout = useCallback(
    async (promoCode: string | null, cancelled: () => boolean) => {
      setLoading(true);
      setError('');
      setClientSecret(null);

      try {
        const res = await fetch('/api/stripe/subscription/prepare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planSlug: primaryPlanSlug,
            addressId: data.addressId,
            specialNotes: data.specialNotes,
            paintKitBump: data.paintKitBump,
            paintKitBumpRecurring: data.paintKitBumpRecurring,
            promotionCode: promoCode,
            couponCode: data.couponCode ?? null,
          }),
        });

        const payload = await res.json().catch(() => ({}));

        if (cancelled()) return;

        if (!res.ok) {
          if (payload.code === 'SUBSCRIPTION_ALREADY_ACTIVE') {
            router.push('/dashboard/subscription');
            router.refresh();
            return;
          }
          throw new Error(
            typeof payload.error === 'string'
              ? payload.error
              : 'Não foi possível iniciar o pagamento.'
          );
        }

        if (!payload.clientSecret || typeof payload.clientSecret !== 'string') {
          throw new Error('Resposta inválida do servidor de pagamento.');
        }

        if (
          typeof payload.subscriptionId === 'string' &&
          payload.subscriptionId
        ) {
          setCheckoutSubscriptionId(payload.subscriptionId);
        }

        setClientSecret(payload.clientSecret);
      } catch (err) {
        if (!cancelled()) {
          setError(
            err instanceof Error ? err.message : 'Erro ao preparar pagamento.'
          );
        }
      } finally {
        if (!cancelled()) setLoading(false);
      }
    },
    [data, primaryPlanSlug, router]
  );

  useEffect(() => {
    if (!STRIPE_CHECKOUT_ACTIVE) {
      setLoading(false);
      return;
    }

    if (!stripeReady) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    void prepareCheckout(promotionCode, () => cancelled);

    return () => {
      cancelled = true;
    };
  }, [stripeReady, promotionCode, prepareCheckout]);

  const handleSuccess = useCallback(
    (subscriptionIds: string[]) => {
      const ids = subscriptionIds.filter(Boolean);
      if (ids.length === 0) {
        router.push('/checkout/success');
        router.refresh();
        return;
      }
      router.push(
        `/checkout/success?ids=${encodeURIComponent(ids.join(','))}`
      );
      router.refresh();
    },
    [router]
  );

  const handleAsaasSubmit = useCallback(
    async (creditCard: AsaasCardPayload) => {
      const res = await fetch('/api/asaas/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planSlugs: data.planSlugs,
          addressId: data.addressId,
          specialNotes: data.specialNotes,
          paintKitBump: data.paintKitBump,
          paintKitBumpRecurring: data.paintKitBumpRecurring,
          billingTerm: data.billingTerm,
          installmentCount: data.installmentCount,
          creditCard,
          couponCode: promotionCode,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (payload.code === 'SUBSCRIPTION_ALREADY_ACTIVE') {
          router.push('/dashboard/subscription');
          router.refresh();
          return;
        }
        throw new Error(
          typeof payload.error === 'string'
            ? payload.error
            : 'Não foi possível confirmar o pagamento.'
        );
      }

      const created = Array.isArray(payload.subscriptions)
        ? payload.subscriptions
        : payload.subscriptionId
          ? [{ subscriptionId: payload.subscriptionId }]
          : [];

      handleSuccess(
        created
          .map(
            (item: { subscriptionId?: string }) => item.subscriptionId ?? ''
          )
          .filter(Boolean)
      );
    },
    [data, promotionCode, router, handleSuccess]
  );

  const displayPrice = (monthlyTotalCents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const paymentDescription = paymentConfigured
    ? isCombo
      ? `Combo ${data.billingTerm === 'combo_3' ? '3' : data.billingTerm === 'combo_6' ? '6' : '12'} meses — R$ ${(comboTotalCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${data.installmentCount > 1 ? ` em ${data.installmentCount}x` : ''}.`
      : data.couponCode
      ? `R$ ${displayPrice}/mês no total com cupom aplicado. Renovação automática.`
      : data.planSlugs.length > 1
        ? `R$ ${displayPrice}/mês no total (${data.planSlugs.length} assinaturas). Pagamento seguro, sem sair do site.`
        : `R$ ${displayPrice}/mês com renovação automática. Pagamento seguro, sem sair do site.`
    : 'Configure o provedor de pagamento para ativar o checkout.';

  return (
    <div className="space-y-8">
      <CheckoutSection
        title="Pagamento"
        subtitle={
          isCombo
            ? 'Pagamento único do combo. Renovação mensal após o período.'
            : 'Cobrança mensal automática. Você pode cancelar a qualquer momento.'
        }
      >
        {profile ? (
          <CheckoutProfileForm
            profile={profile}
            requirePhone={ASAAS_CHECKOUT_READY}
            onSaved={onProfileSaved}
          />
        ) : null}

        {!profileIncomplete ? (
          <>
        {data.couponCode && data.couponSummary ? (
          <p
            className="flex items-center gap-2 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100/90"
            role="status"
          >
            <Tag className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <span className="font-medium">{data.couponCode}</span> —{' '}
              {data.couponSummary}
            </span>
          </p>
        ) : null}

        {stripeSinglePlanOnly && STRIPE_CHECKOUT_ACTIVE ? (
          <p
            className="rounded-sm border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90"
            role="status"
          >
            Múltiplos planos no mesmo pedido estão disponíveis apenas com o
            provedor Asaas.
          </p>
        ) : null}

        {isCombo && asaasReady ? (
          <CheckoutSection
            title="Parcelamento"
            subtitle="Disponível apenas para combos."
          >
            <InstallmentSelector
              value={data.installmentCount}
              onChange={(count) =>
                setData((prev) => ({ ...prev, installmentCount: count }))
              }
              totalCents={comboTotalCents}
            />
          </CheckoutSection>
        ) : null}

        <div className="rounded-sm border border-white/[0.06] bg-stone-950/40 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-stone-950">
              <CreditCard className="h-5 w-5 text-stone-400" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">Cartão de crédito</p>
              <p className="mt-1 text-sm leading-relaxed text-stone-500">
                {paymentDescription}
              </p>
            </div>
          </div>

          <div className="relative mt-5 min-h-[120px] rounded-sm border border-dashed border-white/10 bg-stone-950/50 px-2 py-4">
            {STRIPE_CHECKOUT_ACTIVE && loading ? (
              <div className="flex min-h-[120px] items-center justify-center">
                <Loader2
                  className="h-6 w-6 animate-spin text-ember"
                  aria-hidden="true"
                />
                <span className="sr-only">Carregando formulário de pagamento…</span>
              </div>
            ) : null}

            {ASAAS_CHECKOUT_READY && asaasReady ? (
              <AsaasPaymentForm
                disabled={!asaasReady}
                onSubmit={handleAsaasSubmit}
                onError={(message) => setError(message)}
              />
            ) : null}

            {STRIPE_CHECKOUT_ACTIVE && !loading && stripeReady && clientSecret ? (
              <StripeCheckoutProvider
                key={clientSecret}
                clientSecret={clientSecret}
              >
                <StripePaymentForm
                  disabled={!stripeReady}
                  subscriptionId={checkoutSubscriptionId}
                  onSuccess={() =>
                    handleSuccess(
                      checkoutSubscriptionId ? [checkoutSubscriptionId] : []
                    )
                  }
                  onError={(message) => setError(message)}
                />
              </StripeCheckoutProvider>
            ) : null}

            {STRIPE_CHECKOUT_ACTIVE &&
            !loading &&
            stripeReady &&
            !clientSecret &&
            !error ? (
              <p className="text-center text-sm text-stone-500">
                Não foi possível carregar o pagamento.
              </p>
            ) : null}
          </div>
        </div>

        {error ? (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
          </>
        ) : null}
      </CheckoutSection>

      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-stone-600">
        <li className="flex items-center gap-1.5">
          <Lock className="h-3 w-3" aria-hidden="true" />
          Pagamento seguro (PCI)
        </li>
        <li className="flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
          Cancele quando quiser
        </li>
      </ul>

      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="cursor-pointer rounded-sm border border-white/15 px-5 py-3 font-display text-xs uppercase tracking-widest text-stone-400 transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember disabled:opacity-50"
        >
          Voltar
        </button>
      </div>
    </div>
  );
}
