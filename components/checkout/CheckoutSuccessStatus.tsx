'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { trackPurchase } from '@/lib/analytics/data-layer';
import Logo from '@/components/ui/Logo';

type CheckoutState = 'loading' | 'active' | 'pending' | 'failed' | 'invalid';

type SubscriptionStatusRow = {
  id: string;
  status: string;
  planSlug: string | null;
  planName: string | null;
  priceCents: number | null;
};

const POLL_MS = 2000;
const MAX_ATTEMPTS = 45;
const TRANSIENT_ERROR_ATTEMPTS = 8;

export default function CheckoutSuccessStatus() {
  const searchParams = useSearchParams();
  const subscriptionIds = useMemo(() => {
    const raw = searchParams.get('ids') ?? searchParams.get('subscriptionId');
    if (!raw?.trim()) return [];
    return Array.from(
      new Set(
        raw
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      )
    );
  }, [searchParams]);

  const [state, setState] = useState<CheckoutState>(
    subscriptionIds.length > 0 ? 'loading' : 'invalid'
  );
  const [subscriptionRows, setSubscriptionRows] = useState<SubscriptionStatusRow[]>(
    []
  );
  const purchaseTracked = useRef(false);

  useEffect(() => {
    if (subscriptionIds.length === 0) return;

    let cancelled = false;
    let attempts = 0;

    async function poll() {
      while (!cancelled && attempts < MAX_ATTEMPTS) {
        attempts += 1;
        try {
          const res = await fetch(
            `/api/checkout/status?ids=${encodeURIComponent(subscriptionIds.join(','))}`,
            { cache: 'no-store' }
          );
          const payload = await res.json().catch(() => ({}));

          if (cancelled) return;

          if (!res.ok) {
            if (attempts < TRANSIENT_ERROR_ATTEMPTS && res.status >= 500) {
              await new Promise((resolve) => setTimeout(resolve, POLL_MS));
              continue;
            }
            if (
              attempts < TRANSIENT_ERROR_ATTEMPTS &&
              (res.status === 401 || res.status === 404)
            ) {
              await new Promise((resolve) => setTimeout(resolve, POLL_MS));
              continue;
            }
            setState('failed');
            return;
          }

          if (Array.isArray(payload.subscriptions)) {
            setSubscriptionRows(payload.subscriptions as SubscriptionStatusRow[]);
          }

          if (payload.state === 'active') {
            setState('active');
            return;
          }

          if (payload.state === 'failed') {
            setState('failed');
            return;
          }
        } catch {
          if (
            !cancelled &&
            attempts < TRANSIENT_ERROR_ATTEMPTS
          ) {
            await new Promise((resolve) => setTimeout(resolve, POLL_MS));
            continue;
          }
          if (!cancelled) setState('failed');
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      }

      if (!cancelled) setState('pending');
    }

    void poll();

    return () => {
      cancelled = true;
    };
  }, [subscriptionIds]);

  useEffect(() => {
    if (state !== 'active' || purchaseTracked.current || subscriptionRows.length === 0) {
      return;
    }

    const items = subscriptionRows
      .filter((row) => row.planSlug && row.priceCents != null)
      .map((row) => ({
        item_id: row.planSlug!,
        item_name: row.planName ?? row.planSlug!,
        price: row.priceCents! / 100,
      }));

    if (items.length === 0) return;

    purchaseTracked.current = true;
    trackPurchase({
      transactionId: subscriptionIds.join(','),
      value: items.reduce((sum, item) => sum + item.price, 0),
      items,
    });
  }, [state, subscriptionIds, subscriptionRows]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-stone-950 bg-grid noise">
      <div
        className="pointer-events-none absolute -right-24 top-32 h-72 w-72 rounded-full bg-ember/15 blur-[100px]"
        aria-hidden="true"
      />

      <main className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
        <Logo variant="nav" />

        {state === 'loading' ? (
          <>
            <Loader2
              className="mt-10 h-8 w-8 animate-spin text-ember"
              aria-hidden="true"
            />
            <p className="mt-6 font-display text-xs uppercase tracking-[0.3em] text-frost">
              Confirmando pagamento
            </p>
            <h1 className="mt-3 font-display text-3xl uppercase tracking-wide text-white sm:text-4xl">
              Aguarde um instante
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-stone-400">
              Estamos validando sua assinatura com o gateway de pagamento. Isso
              costuma levar alguns segundos.
            </p>
          </>
        ) : null}

        {state === 'active' ? (
          <>
            <p className="mt-10 font-display text-xs uppercase tracking-[0.3em] text-frost">
              Bem-vindo à guilda
            </p>
            <h1 className="mt-3 font-display text-4xl uppercase tracking-wide text-white">
              Assinatura ativa
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-stone-400">
              Sua primeira dungeon está a caminho. Acompanhe entregas,
              pagamentos e fidelidade no painel da conta.
            </p>
            <Link
              href="/dashboard"
              className="mt-10 inline-flex cursor-pointer rounded-sm bg-ember px-8 py-3.5 font-display text-sm uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
            >
              Ir para minha conta
            </Link>
          </>
        ) : null}

        {state === 'pending' ? (
          <>
            <p className="mt-10 font-display text-xs uppercase tracking-[0.3em] text-amber-200/80">
              Pagamento em análise
            </p>
            <h1 className="mt-3 font-display text-3xl uppercase tracking-wide text-white sm:text-4xl">
              Quase lá
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-stone-400">
              Seu pagamento ainda não foi confirmado. Assim que o gateway
              aprovar, a assinatura aparecerá como ativa no painel.
            </p>
            <Link
              href="/dashboard/subscription"
              className="mt-10 inline-flex cursor-pointer rounded-sm bg-ember px-8 py-3.5 font-display text-sm uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
            >
              Ver assinatura
            </Link>
          </>
        ) : null}

        {state === 'failed' || state === 'invalid' ? (
          <>
            <p className="mt-10 font-display text-xs uppercase tracking-[0.3em] text-red-300/80">
              Não foi possível confirmar
            </p>
            <h1 className="mt-3 font-display text-3xl uppercase tracking-wide text-white sm:text-4xl">
              Pagamento não confirmado
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-stone-400">
              {state === 'invalid'
                ? 'Volte ao checkout e tente novamente.'
                : 'O pagamento pode ter sido aprovado mesmo assim. Verifique sua conta antes de tentar de novo.'}
            </p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/dashboard/subscription"
                className="inline-flex cursor-pointer rounded-sm bg-ember px-8 py-3.5 font-display text-sm uppercase tracking-widest text-stone-950 transition hover:bg-ember-bright"
              >
                Ver minha assinatura
              </Link>
              <Link
                href="/checkout"
                className="inline-flex cursor-pointer rounded-sm border border-white/15 px-8 py-3.5 font-display text-sm uppercase tracking-widest text-stone-300 transition hover:text-white"
              >
                Voltar ao checkout
              </Link>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
