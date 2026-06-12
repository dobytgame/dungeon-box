'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  CreditCard,
  Lock,
  Loader2,
  ShieldCheck,
  Tag,
  X,
} from 'lucide-react';
import { checkoutHref, getCheckoutPlan } from '@/lib/checkout/plans';
import { CHECKOUT_COUPONS_ENABLED } from '@/lib/checkout/public';
import type { CheckoutData } from '@/lib/checkout/types';
import type { Profile } from '@/lib/dashboard/types';
import {
  ASAAS_CHECKOUT_READY,
  STRIPE_CHECKOUT_ACTIVE,
} from '@/lib/payments/public';
import {
  STRIPE_COUPONS_ENABLED,
} from '@/lib/stripe/public';
import AsaasPaymentForm, {
  type AsaasCardPayload,
} from './AsaasPaymentForm';
import CheckoutSection from './CheckoutSection';
import StripeCheckoutProvider from './StripeCheckoutProvider';
import StripePaymentForm from './StripePaymentForm';

interface Props {
  data: CheckoutData;
  setData: Dispatch<SetStateAction<CheckoutData>>;
  profile: Profile | null;
  userEmail: string;
  onBack: () => void;
}

export default function StepPayment({
  data,
  setData,
  profile,
  userEmail,
  onBack,
}: Props) {
  const router = useRouter();
  const plan = getCheckoutPlan(data.planSlug);
  const cpfDigits = profile?.cpf?.replace(/\D/g, '') ?? '';
  const phoneDigits = profile?.phone?.replace(/\D/g, '') ?? '';
  const cpfReady = cpfDigits.length === 11;
  const phoneReady = phoneDigits.length >= 10;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(ASAAS_CHECKOUT_READY ? false : true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);

  const promotionCode = data.couponCode ?? null;
  const couponSummary = data.couponSummary ?? null;
  const discountedPriceCents = data.discountedPlanCents ?? null;

  const profileNext = encodeURIComponent(checkoutHref(data.planSlug));
  const siteCouponsEnabled =
    ASAAS_CHECKOUT_READY && CHECKOUT_COUPONS_ENABLED;
  const couponsEnabled =
    (siteCouponsEnabled || (STRIPE_CHECKOUT_ACTIVE && STRIPE_COUPONS_ENABLED)) &&
    cpfReady;
  const stripeReady =
    STRIPE_CHECKOUT_ACTIVE && cpfReady && Boolean(data.addressId);
  const asaasReady =
    ASAAS_CHECKOUT_READY &&
    cpfReady &&
    phoneReady &&
    Boolean(data.addressId);
  const paymentConfigured = ASAAS_CHECKOUT_READY || STRIPE_CHECKOUT_ACTIVE;

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
            planSlug: data.planSlug,
            addressId: data.addressId,
            specialNotes: data.specialNotes,
            paintKitBump: data.paintKitBump,
            promotionCode: promoCode,
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
    [data, router]
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

  const handleApplyCoupon = useCallback(async () => {
    const code = couponInput.trim();
    if (!code) {
      setError('Informe o código do cupom.');
      return;
    }

    setCouponLoading(true);
    setError('');

    try {
      const endpoint = siteCouponsEnabled
        ? '/api/checkout/coupon/validate'
        : '/api/stripe/promotion-code/validate';
      const requestBody = siteCouponsEnabled
        ? { code, planSlug: data.planSlug }
        : { code };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok || !payload.valid) {
        throw new Error(
          typeof payload.error === 'string'
            ? payload.error
            : 'Cupom inválido.'
        );
      }

      const appliedCode = payload.code ?? code;
      const appliedSummary =
        typeof payload.summary === 'string' ? payload.summary : 'Cupom aplicado';
      const appliedDiscount =
        typeof payload.discountedPriceCents === 'number'
          ? payload.discountedPriceCents
          : null;

      setCouponInput(appliedCode);
      setData((prev) => ({
        ...prev,
        couponCode: appliedCode,
        couponSummary: appliedSummary,
        discountedPlanCents: appliedDiscount,
      }));
    } catch (err) {
      setData((prev) => ({
        ...prev,
        couponCode: null,
        couponSummary: null,
        discountedPlanCents: null,
      }));
      setError(err instanceof Error ? err.message : 'Cupom inválido.');
    } finally {
      setCouponLoading(false);
    }
  }, [couponInput, data.planSlug, siteCouponsEnabled, setData]);

  const handleRemoveCoupon = useCallback(() => {
    setCouponInput('');
    setData((prev) => ({
      ...prev,
      couponCode: null,
      couponSummary: null,
      discountedPlanCents: null,
    }));
    setError('');
  }, [setData]);

  const handleSuccess = useCallback(() => {
    router.push('/checkout/success');
    router.refresh();
  }, [router]);

  const handleAsaasSubmit = useCallback(
    async (creditCard: AsaasCardPayload) => {
      const res = await fetch('/api/asaas/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planSlug: data.planSlug,
          addressId: data.addressId,
          specialNotes: data.specialNotes,
          paintKitBump: data.paintKitBump,
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

      handleSuccess();
    },
    [data, promotionCode, router, handleSuccess]
  );

  const displayPrice =
    discountedPriceCents != null
      ? (discountedPriceCents / 100).toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : plan.price;

  const paymentDescription = paymentConfigured
    ? discountedPriceCents != null
      ? `R$ ${displayPrice}/mês com cupom aplicado. Renovação automática no valor promocional.`
      : `R$ ${plan.price}/mês com renovação automática. Pagamento seguro, sem sair do site.`
    : 'Configure o provedor de pagamento para ativar o checkout.';

  return (
    <div className="space-y-8">
      <CheckoutSection
        title="Pagamento"
        subtitle="Cobrança mensal automática. Você pode cancelar a qualquer momento."
      >
        {!cpfReady ? (
          <div
            className="rounded-sm border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100/90"
            role="status"
          >
            <p>
              O CPF é obrigatório para assinaturas recorrentes. Cadastre o seu
              CPF no perfil antes de pagar.
            </p>
            <Link
              href={`/dashboard/profile?next=${profileNext}`}
              className="mt-3 inline-flex font-display text-xs uppercase tracking-widest text-ember hover:text-ember-bright"
            >
              Completar perfil
            </Link>
          </div>
        ) : null}

        {ASAAS_CHECKOUT_READY && cpfReady && !phoneReady ? (
          <div
            className="rounded-sm border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100/90"
            role="status"
          >
            <p>
              O telefone é obrigatório para pagamento com cartão. Cadastre seu
              telefone no perfil antes de pagar.
            </p>
            <Link
              href={`/dashboard/profile?next=${profileNext}`}
              className="mt-3 inline-flex font-display text-xs uppercase tracking-widest text-ember hover:text-ember-bright"
            >
              Completar perfil
            </Link>
          </div>
        ) : null}

        {couponsEnabled ? (
          <div className="rounded-sm border border-white/[0.06] bg-stone-950/30 p-4">
            {!showCoupon && !promotionCode ? (
              <button
                type="button"
                onClick={() => setShowCoupon(true)}
                className="flex cursor-pointer items-center gap-2 text-sm text-stone-400 transition-colors hover:text-ember"
              >
                <Tag className="h-4 w-4" aria-hidden="true" />
                Tem um cupom de desconto?
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-medium text-white">
                    <Tag className="h-4 w-4 text-ember" aria-hidden="true" />
                    Cupom de desconto
                  </p>
                  {promotionCode ? (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      disabled={loading || couponLoading}
                      className="flex cursor-pointer items-center gap-1 text-xs text-stone-500 transition-colors hover:text-stone-300 disabled:opacity-50"
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                      Remover
                    </button>
                  ) : null}
                </div>

                {promotionCode && couponSummary ? (
                  <p
                    className="rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100/90"
                    role="status"
                  >
                    <span className="font-medium">{promotionCode}</span> —{' '}
                    {couponSummary}
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
                      disabled={loading || couponLoading}
                      className="min-w-0 flex-1 rounded-sm border border-white/10 bg-stone-950 px-3 py-2.5 text-sm text-white placeholder:text-stone-600 focus:border-ember/50 focus:outline-none focus:ring-1 focus:ring-ember/30 disabled:opacity-50"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      onClick={() => void handleApplyCoupon()}
                      disabled={loading || couponLoading || !couponInput.trim()}
                      className="cursor-pointer rounded-sm border border-white/15 px-4 py-2.5 font-display text-xs uppercase tracking-widest text-stone-300 transition-colors hover:border-ember/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {couponLoading ? 'Validando…' : 'Aplicar'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
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
                  onSuccess={handleSuccess}
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
