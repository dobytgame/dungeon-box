'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Lock, Loader2, ShieldCheck } from 'lucide-react';
import { checkoutHref, getCheckoutPlan } from '@/lib/checkout/plans';
import type { CheckoutData } from '@/lib/checkout/types';
import type { Profile } from '@/lib/dashboard/types';
import { STRIPE_CHECKOUT_READY } from '@/lib/stripe/public';
import CheckoutSection from './CheckoutSection';
import StripeCheckoutProvider from './StripeCheckoutProvider';
import StripePaymentForm from './StripePaymentForm';

interface Props {
  data: CheckoutData;
  profile: Profile | null;
  userEmail: string;
  onBack: () => void;
}

export default function StepPayment({ data, profile, userEmail, onBack }: Props) {
  const router = useRouter();
  const plan = getCheckoutPlan(data.planSlug);
  const cpfDigits = profile?.cpf?.replace(/\D/g, '') ?? '';
  const cpfReady = cpfDigits.length === 11;
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const profileNext = encodeURIComponent(checkoutHref(data.planSlug));
  const stripeReady = STRIPE_CHECKOUT_READY && cpfReady && Boolean(data.addressId);

  useEffect(() => {
    if (!stripeReady) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function prepare() {
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
          }),
        });

        const payload = await res.json().catch(() => ({}));

        if (cancelled) return;

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
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Erro ao preparar pagamento.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void prepare();

    return () => {
      cancelled = true;
    };
  }, [
    stripeReady,
    data.planSlug,
    data.addressId,
    data.specialNotes,
    data.paintKitBump,
    router,
  ]);

  const handleSuccess = useCallback(() => {
    router.push('/checkout/success');
    router.refresh();
  }, [router]);

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

        <div className="rounded-sm border border-white/[0.06] bg-stone-950/40 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-stone-950">
              <CreditCard className="h-5 w-5 text-stone-400" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">Cartão de crédito</p>
              <p className="mt-1 text-sm leading-relaxed text-stone-500">
                {STRIPE_CHECKOUT_READY
                  ? `R$ ${plan.price}/mês com renovação automática. Pagamento seguro, sem sair do site.`
                  : 'Configure as chaves do Stripe para ativar o pagamento.'}
              </p>
            </div>
          </div>

          <div className="relative mt-5 min-h-[120px] rounded-sm border border-dashed border-white/10 bg-stone-950/50 px-2 py-4">
            {loading ? (
              <div className="flex min-h-[120px] items-center justify-center">
                <Loader2
                  className="h-6 w-6 animate-spin text-ember"
                  aria-hidden="true"
                />
                <span className="sr-only">Carregando formulário de pagamento…</span>
              </div>
            ) : null}

            {!loading && stripeReady && clientSecret ? (
              <StripeCheckoutProvider clientSecret={clientSecret}>
                <StripePaymentForm
                  disabled={!stripeReady}
                  onSuccess={handleSuccess}
                  onError={(message) => setError(message)}
                />
              </StripeCheckoutProvider>
            ) : null}

            {!loading && stripeReady && !clientSecret && !error ? (
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
