'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react';
import PagarmePaymentForm from '@/components/checkout/PagarmePaymentForm';
import Logo from '@/components/ui/Logo';
import { formatDate, formatMoney } from '@/lib/dashboard/format';
import type { MigrationPreview } from '@/lib/pagarme/migration-preview';

type PreviewOk = Extract<MigrationPreview, { ok: true }>;
type PreviewError = Extract<MigrationPreview, { ok: false }>;

function billingTermLabel(term: string | null): string {
  if (term === 'combo_3') return 'Combo 3 meses';
  if (term === 'combo_6') return 'Combo 6 meses';
  if (term === 'combo_12') return 'Combo 12 meses';
  return 'Mensal';
}

function ErrorState({ preview }: { preview: PreviewError }) {
  const isDone = preview.reason === 'already_updated';

  return (
    <div className="relative min-h-screen overflow-hidden bg-stone-950 bg-grid noise">
      <div
        className="pointer-events-none absolute -left-20 top-24 h-64 w-64 rounded-full bg-ember/10 blur-[100px]"
        aria-hidden="true"
      />
      <main className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
        <Logo variant="nav" linked={false} />
        <p
          className={`mt-10 font-display text-xs uppercase tracking-[0.3em] ${
            isDone ? 'text-frost' : 'text-amber-200/80'
          }`}
        >
          {isDone ? 'Tudo certo' : 'Link indisponível'}
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-wide text-white sm:text-4xl">
          {isDone ? 'Pagamento já atualizado' : 'Não foi possível continuar'}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-400">
          {preview.message}
        </p>
        <Link
          href={isDone ? '/dashboard/subscription' : '/auth?next=/dashboard'}
          className="mt-10 inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-sm bg-ember px-8 py-3.5 font-display text-sm uppercase tracking-widest text-stone-950 transition-colors duration-200 hover:bg-ember-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
        >
          {isDone ? 'Ir para minha conta' : 'Entrar na conta'}
        </Link>
      </main>
    </div>
  );
}

function SuccessState({ preview }: { preview: PreviewOk }) {
  const billingLabel = formatDate(preview.nextBillingDate);

  return (
    <div className="relative min-h-screen overflow-hidden bg-stone-950 bg-grid noise">
      <div
        className="pointer-events-none absolute -right-24 top-28 h-72 w-72 rounded-full bg-ember/15 blur-[100px]"
        aria-hidden="true"
      />
      <main className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
        <Logo variant="nav" linked={false} />
        <div className="mt-10 flex items-center gap-3 text-emerald-300">
          <CheckCircle2 className="h-7 w-7 shrink-0" aria-hidden="true" />
          <p className="font-display text-xs uppercase tracking-[0.3em]">
            Cartão atualizado
          </p>
        </div>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-wide text-white sm:text-4xl">
          Pronto, {preview.customerName?.split(' ')[0] ?? 'aventureiro'}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-400">
          Sua assinatura <span className="text-white">{preview.planName}</span>{' '}
          continua ativa na nova plataforma.
          {billingLabel !== '—' ? (
            <>
              {' '}
              A próxima cobrança de{' '}
              <span className="text-white">
                {formatMoney(preview.totalCents)}
              </span>{' '}
              segue em <span className="text-white">{billingLabel}</span> — sem
              cobrança antecipada.
            </>
          ) : null}
        </p>
        <Link
          href="/dashboard/subscription"
          className="mt-10 inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-sm bg-ember px-8 py-3.5 font-display text-sm uppercase tracking-widest text-stone-950 transition-colors duration-200 hover:bg-ember-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
        >
          Ver minha assinatura
        </Link>
      </main>
    </div>
  );
}

export default function UpdatePaymentClient({
  preview,
}: {
  preview: MigrationPreview;
}) {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!preview.ok) {
    return <ErrorState preview={preview} />;
  }

  if (success) {
    return <SuccessState preview={preview} />;
  }

  const firstName =
    preview.customerName?.trim().split(/\s+/)[0] ?? null;
  const billingLabel = formatDate(preview.nextBillingDate);

  return (
    <div className="relative min-h-screen overflow-hidden bg-stone-950 bg-grid noise">
      <div
        className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-ember/12 blur-[110px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -right-20 bottom-10 h-64 w-64 rounded-full bg-frost/10 blur-[100px]"
        aria-hidden="true"
      />

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
        <header className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
          <Logo variant="nav" linked={false} />
          <p className="font-display text-[10px] uppercase tracking-[0.28em] text-stone-500">
            Atualização segura de pagamento
          </p>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-10">
          <section className="space-y-6">
            <div>
              <p className="font-display text-xs uppercase tracking-[0.3em] text-frost">
                Confirme seus dados
              </p>
              <h1 className="mt-3 font-display text-4xl uppercase tracking-wide text-white sm:text-5xl">
                {firstName ? `Olá, ${firstName}` : 'Olá, aventureiro'}
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-stone-400">
                Estamos migrando sua cobrança para o Pagar.me. Confira o resumo
                da assinatura e cadastre o cartão. Atualizar agora{' '}
                <span className="text-white">não gera cobrança antecipada</span>.
              </p>
            </div>

            <div className="overflow-hidden rounded-sm border border-white/[0.08] bg-stone-900/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="h-1 w-full bg-ember" aria-hidden="true" />
              <div className="space-y-5 p-5 sm:p-6">
                <div>
                  <p className="font-display text-[10px] uppercase tracking-[0.28em] text-stone-500">
                    Assinante
                  </p>
                  <p className="mt-2 text-lg text-white">
                    {preview.customerName || 'Cliente DungeonBox'}
                  </p>
                  <p className="mt-1 font-mono text-xs text-stone-500">
                    {preview.customerEmail}
                  </p>
                </div>

                <dl className="grid gap-4 border-t border-white/[0.06] pt-5 sm:grid-cols-2">
                  <div>
                    <dt className="font-display text-[10px] uppercase tracking-[0.28em] text-stone-500">
                      Plano
                    </dt>
                    <dd className="mt-2 text-white">{preview.planName}</dd>
                    <dd className="mt-1 text-xs text-stone-500">
                      {billingTermLabel(preview.billingTerm)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-display text-[10px] uppercase tracking-[0.28em] text-stone-500">
                      Próximo vencimento
                    </dt>
                    <dd className="mt-2 font-display text-xl tabular-nums text-white">
                      {billingLabel}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-display text-[10px] uppercase tracking-[0.28em] text-stone-500">
                      Valor do plano
                    </dt>
                    <dd className="mt-2 tabular-nums text-white">
                      {preview.priceCents < preview.originalPriceCents ? (
                        <>
                          <span className="mr-2 text-stone-500 line-through">
                            {formatMoney(preview.originalPriceCents)}
                          </span>
                          {formatMoney(preview.priceCents)}
                        </>
                      ) : (
                        formatMoney(preview.priceCents)
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-display text-[10px] uppercase tracking-[0.28em] text-stone-500">
                      Frete mensal
                    </dt>
                    <dd className="mt-2 tabular-nums text-white">
                      {preview.shippingCents > 0 ? (
                        preview.shippingCents < preview.originalShippingCents ? (
                          <>
                            <span className="mr-2 text-stone-500 line-through">
                              {formatMoney(preview.originalShippingCents)}
                            </span>
                            {formatMoney(preview.shippingCents)}
                          </>
                        ) : (
                          formatMoney(preview.shippingCents)
                        )
                      ) : preview.originalShippingCents > 0 ? (
                        <>
                          <span className="mr-2 text-stone-500 line-through">
                            {formatMoney(preview.originalShippingCents)}
                          </span>
                          Grátis
                        </>
                      ) : (
                        'Incluso / grátis'
                      )}
                    </dd>
                  </div>
                  {preview.bumpCents > 0 ? (
                    <div className="sm:col-span-2">
                      <dt className="font-display text-[10px] uppercase tracking-[0.28em] text-stone-500">
                        Adicional recorrente
                      </dt>
                      <dd className="mt-2 tabular-nums text-white">
                        {formatMoney(preview.bumpCents)}
                      </dd>
                    </div>
                  ) : null}
                  {preview.promoCode ? (
                    <div className="sm:col-span-2">
                      <dt className="font-display text-[10px] uppercase tracking-[0.28em] text-stone-500">
                        Cupom aplicado
                      </dt>
                      <dd className="mt-2 text-white">
                        <span className="font-mono text-sm tracking-wide text-frost">
                          {preview.promoCode}
                        </span>
                        {preview.promoSummary ? (
                          <span className="mt-1 block text-xs text-stone-500">
                            {preview.promoSummary}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <div className="flex items-end justify-between gap-4 border-t border-white/[0.06] pt-5">
                  <div>
                    <p className="font-display text-[10px] uppercase tracking-[0.28em] text-gold">
                      Total na cobrança
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      Cobrado apenas na data de vencimento
                    </p>
                  </div>
                  <div className="text-right">
                    {preview.totalCents < preview.originalTotalCents ? (
                      <p className="text-sm tabular-nums text-stone-500 line-through">
                        {formatMoney(preview.originalTotalCents)}
                      </p>
                    ) : null}
                    <p className="font-display text-3xl tabular-nums text-gold">
                      {formatMoney(preview.totalCents)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <ul className="space-y-3 text-sm text-stone-400">
              <li className="flex gap-3">
                <ShieldCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-frost"
                  aria-hidden="true"
                />
                <span>
                  Dados do cartão tokenizados — não armazenamos o número
                  completo.
                </span>
              </li>
              <li className="flex gap-3">
                <CreditCard
                  className="mt-0.5 h-4 w-4 shrink-0 text-frost"
                  aria-hidden="true"
                />
                <span>
                  Plano, valor e benefícios permanecem iguais após a migração.
                </span>
              </li>
            </ul>
          </section>

          <section className="rounded-sm border border-white/[0.08] bg-stone-900/40 p-5 sm:p-6">
            <div className="mb-5">
              <p className="font-display text-xs uppercase tracking-[0.3em] text-ember-bright">
                Passo final
              </p>
              <h2 className="mt-2 font-display text-2xl uppercase tracking-wide text-white">
                Cadastre o cartão
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-400">
                Use o cartão que receberá a cobrança de{' '}
                <span className="text-white">
                  {formatMoney(preview.totalCents)}
                </span>
                {billingLabel !== '—' ? (
                  <>
                    {' '}
                    em <span className="text-white">{billingLabel}</span>
                  </>
                ) : null}
                .
              </p>
            </div>

            <PagarmePaymentForm
              submitLabel={
                submitting ? 'Processando…' : 'Confirmar e atualizar'
              }
              onSubmit={async (tokenized) => {
                setError('');
                setSubmitting(true);
                try {
                  const res = await fetch('/api/subscriptions/migrate-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      updateToken: preview.token,
                      cardToken: tokenized.token,
                      cardLast4: tokenized.last4,
                      cardBrand: tokenized.brand,
                    }),
                  });
                  const payload = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    setError(
                      typeof payload.error === 'string'
                        ? payload.error
                        : 'Não foi possível atualizar o cartão.'
                    );
                    return;
                  }
                  setSuccess(true);
                } finally {
                  setSubmitting(false);
                }
              }}
              onError={setError}
            />

            {error ? (
              <p
                className="mt-4 rounded-sm border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
                role="alert"
              >
                {error}
              </p>
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}
