'use client';

import { useId, useRef, useState } from 'react';
import type { PlanSlug } from '@/lib/checkout/plans';
import { trackGuildShippingQuoteSuccess } from '@/lib/guild-lp/analytics';
import { guildLpCopy } from '@/lib/guild-lp/copy';
import { getGuildDisplayPlans } from '@/lib/guild-lp/plans-display';
import { maskCep, digitsOnly } from '@/lib/masks';
import { formatShippingBRL } from '@/lib/shipping/quote';
import GuildLpMark from '@/components/guild-lp/GuildLpMark';

type QuoteState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'success';
      planSlug: PlanSlug;
      shippingLabel: string;
      shippingCents: number;
      productCents: number;
      totalCents: number;
      etaDaysMin: number;
      etaDaysMax: number;
      productionLeadBusinessDays: number;
      regionLabel: string;
    };

function formatProductBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export default function GuildLpShippingEstimate() {
  const plans = getGuildDisplayPlans();
  const [planSlug, setPlanSlug] = useState<PlanSlug>(plans[1]?.id ?? 'heroi');
  const [cep, setCep] = useState('');
  const [quote, setQuote] = useState<QuoteState>({ status: 'idle' });
  const requestSeq = useRef(0);
  const cepId = useId();
  const planId = useId();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const digits = digitsOnly(cep);
    if (digits.length !== 8) {
      setQuote({ status: 'error', message: 'Informe um CEP válido com 8 dígitos.' });
      return;
    }

    const seq = ++requestSeq.current;
    setQuote({ status: 'loading' });

    try {
      const res = await fetch('/api/shipping/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planSlug, zipCode: digits }),
      });
      const json = (await res.json()) as Record<string, unknown>;

      if (seq !== requestSeq.current) return;

      if (!res.ok) {
        setQuote({
          status: 'error',
          message:
            (typeof json.error === 'string' ? json.error : null) ??
            'Não conseguimos calcular o frete agora. Tente novamente ou fale com a equipe.',
        });
        return;
      }

      const data = json as {
        shippingLabel: string;
        shippingCents: number;
        productCents: number;
        totalCents: number;
        etaDaysMin: number;
        etaDaysMax: number;
        productionLeadBusinessDays: number;
        regionLabel: string;
        planSlug: PlanSlug;
      };

      setQuote({
        status: 'success',
        planSlug: data.planSlug,
        shippingLabel: data.shippingLabel,
        shippingCents: data.shippingCents,
        productCents: data.productCents,
        totalCents: data.totalCents,
        etaDaysMin: data.etaDaysMin,
        etaDaysMax: data.etaDaysMax,
        productionLeadBusinessDays: data.productionLeadBusinessDays,
        regionLabel: data.regionLabel,
      });

      trackGuildShippingQuoteSuccess(planSlug);
    } catch {
      if (seq !== requestSeq.current) return;
      setQuote({
        status: 'error',
        message:
          'Não conseguimos calcular o frete agora. Tente novamente ou fale com a equipe.',
      });
    }
  }

  return (
    <section
      id="frete"
      className="scroll-mt-24 border-t border-white/[0.06] bg-relic-ink px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
      aria-labelledby="frete-title"
    >
      <div className="mx-auto max-w-[720px]">
        <p className="flex items-center gap-2 font-cinzel text-[11px] font-semibold uppercase tracking-[0.28em] text-relic-gold">
          <GuildLpMark className="h-2.5 w-2.5" />
          {guildLpCopy.shippingEyebrow}
        </p>
        <h2
          id="frete-title"
          className="mt-4 font-cinzel text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold uppercase leading-[0.95] tracking-wide text-relic-parchment"
        >
          {guildLpCopy.shippingTitle}
        </h2>
        <p className="mt-3 text-base leading-relaxed text-relic-muted">
          {guildLpCopy.shippingSub}
        </p>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="mt-8 space-y-4 rounded-lg border border-white/[0.08] bg-relic-surface p-5 sm:p-6"
        >
          <div>
            <label htmlFor={planId} className="text-sm font-semibold text-relic-parchment">
              Plano
            </label>
            <select
              id={planId}
              value={planSlug}
              onChange={(event) => {
                setPlanSlug(event.target.value as PlanSlug);
                setQuote({ status: 'idle' });
              }}
              className="mt-2 w-full min-h-[48px] rounded border border-white/10 bg-relic-ink px-3 py-2.5 text-sm text-relic-parchment outline-none focus:border-relic-gold/50"
            >
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} — R$ {plan.price}/mês
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor={cepId} className="text-sm font-semibold text-relic-parchment">
              CEP de entrega
            </label>
            <input
              id={cepId}
              inputMode="numeric"
              autoComplete="postal-code"
              value={cep}
              onChange={(event) => {
                setCep(maskCep(event.target.value));
                if (quote.status === 'success') setQuote({ status: 'idle' });
              }}
              placeholder="00000-000"
              className="mt-2 w-full min-h-[48px] rounded border border-white/10 bg-relic-ink px-3 py-2.5 text-sm text-relic-parchment outline-none focus:border-relic-gold/50"
            />
          </div>

          <button
            type="submit"
            disabled={quote.status === 'loading'}
            className="inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center rounded border border-relic-gold bg-relic-gold px-5 py-3 font-cinzel text-sm font-bold uppercase tracking-[0.08em] text-relic-ink transition hover:bg-relic-goldLight disabled:cursor-not-allowed disabled:opacity-70"
          >
            {quote.status === 'loading' ? 'Calculando…' : 'Consultar frete e prazo'}
          </button>

          {quote.status === 'error' ? (
            <p className="text-sm text-red-300" role="alert">
              {quote.message}
            </p>
          ) : null}

          {quote.status === 'success' ? (
            <div
              className="space-y-3 border-t border-white/[0.06] pt-4 text-sm text-relic-parchment"
              aria-live="polite"
            >
              <p>
                <span className="text-relic-muted">Região:</span> {quote.regionLabel}
              </p>
              <p>
                <span className="text-relic-muted">Plano (1ª cobrança):</span>{' '}
                {formatProductBRL(quote.productCents)}
              </p>
              <p>
                <span className="text-relic-muted">Frete:</span>{' '}
                {quote.shippingCents === 0
                  ? quote.shippingLabel
                  : formatShippingBRL(quote.shippingCents)}
              </p>
              <p>
                <span className="text-relic-muted">Produção:</span> até{' '}
                {quote.productionLeadBusinessDays} dias úteis após pagamento aprovado
              </p>
              <p>
                <span className="text-relic-muted">Transporte (estimativa):</span>{' '}
                {quote.etaDaysMin}–{quote.etaDaysMax} dias corridos após postagem
              </p>
              <p className="font-cinzel text-base font-semibold text-relic-gold">
                Total estimado da 1ª cobrança: {formatProductBRL(quote.totalCents)}
              </p>
              <p className="text-xs text-relic-muted">
                Valores finais confirmados no checkout com seu endereço completo.
              </p>
            </div>
          ) : null}
        </form>
      </div>
    </section>
  );
}
