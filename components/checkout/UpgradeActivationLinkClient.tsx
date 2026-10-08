'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import PagarmePaymentForm from '@/components/checkout/PagarmePaymentForm';
import Logo from '@/components/ui/Logo';
import { formatDate, formatMoney } from '@/lib/dashboard/format';
import type { UpgradePaymentLinkPreview } from '@/lib/subscriptions/upgrade-payment-link';

type PreviewOk = Extract<UpgradePaymentLinkPreview, { ok: true }>;
type PreviewError = Extract<UpgradePaymentLinkPreview, { ok: false }>;

function ErrorState({ preview }: { preview: PreviewError }) {
  const isDone = preview.reason === 'used';

  return (
    <div className="relative min-h-screen overflow-hidden bg-stone-950 bg-grid noise">
      <main className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
        <Logo variant="nav" linked={false} />
        <p
          className={`mt-10 font-display text-xs uppercase tracking-[0.3em] ${
            isDone ? 'text-frost' : 'text-amber-200/80'
          }`}
        >
          {isDone ? 'Pagamento confirmado' : 'Link indisponível'}
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-wide text-white sm:text-4xl">
          {isDone ? 'Plano já ativado' : 'Não foi possível continuar'}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-400">{preview.message}</p>
        <Link
          href="/dashboard/subscription"
          className="mt-10 inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-sm bg-ember px-8 py-3.5 font-display text-sm uppercase tracking-widest text-stone-950 transition-colors duration-200 hover:bg-ember-bright"
        >
          Ir para minha conta
        </Link>
      </main>
    </div>
  );
}

export default function UpgradeActivationLinkClient({
  preview,
}: {
  preview: UpgradePaymentLinkPreview;
}) {
  const [donePlan, setDonePlan] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!preview.ok) return <ErrorState preview={preview} />;

  if (donePlan) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-stone-950 bg-grid noise">
        <main className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
          <Logo variant="nav" linked={false} />
          <div className="mt-10 flex items-center gap-3 text-emerald-300">
            <CheckCircle2 className="h-7 w-7 shrink-0" aria-hidden="true" />
            <p className="font-display text-xs uppercase tracking-[0.3em]">
              Pagamento confirmado
            </p>
          </div>
          <h1 className="mt-3 font-display text-3xl uppercase tracking-wide text-white sm:text-4xl">
            {donePlan} ativo
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-stone-400">
            O atraso foi quitado e o plano novo já vale nesta assinatura. O cartão
            informado fica salvo para as próximas cobranças.
          </p>
          <Link
            href="/dashboard/subscription"
            className="mt-10 inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-sm bg-ember px-8 py-3.5 font-display text-sm uppercase tracking-widest text-stone-950 transition-colors duration-200 hover:bg-ember-bright"
          >
            Ir para minha conta
          </Link>
        </main>
      </div>
    );
  }

  return (
    <PaymentForm
      preview={preview}
      error={error}
      submitting={submitting}
      onError={setError}
      onSubmitStart={() => {
        setError('');
        setSubmitting(true);
      }}
      onSubmitEnd={() => setSubmitting(false)}
      onPaid={setDonePlan}
    />
  );
}

function PaymentForm({
  preview,
  error,
  submitting,
  onError,
  onSubmitStart,
  onSubmitEnd,
  onPaid,
}: {
  preview: PreviewOk;
  error: string;
  submitting: boolean;
  onError: (message: string) => void;
  onSubmitStart: () => void;
  onSubmitEnd: () => void;
  onPaid: (planName: string) => void;
}) {
  const firstName = preview.customerName?.trim().split(' ')[0] || null;
  const nextBilling = formatDate(preview.nextBillingDate);

  return (
    <div className="relative min-h-screen overflow-hidden bg-stone-950 bg-grid noise">
      <main className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
        <Logo variant="nav" linked={false} />
        <p className="mt-10 font-display text-xs uppercase tracking-[0.3em] text-ember-bright">
          Ativar upgrade
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-wide text-white sm:text-4xl">
          {firstName ? `Olá, ${firstName}` : 'Pagar e ativar o plano'}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-400">
          A assinatura <span className="text-white">{preview.currentPlanName}</span> está
          em atraso. Informe um cartão para pagar{' '}
          <span className="text-white">{formatMoney(preview.amountCents)}</span> e ativar o{' '}
          <span className="text-white">{preview.targetPlanName}</span>
          {preview.promoSummary ? ` (${preview.promoSummary.toLowerCase()})` : ''}.
          {nextBilling !== '—' ? (
            <>
              {' '}
              A próxima cobrança continua em <span className="text-white">{nextBilling}</span>.
            </>
          ) : null}
        </p>

        <section className="mt-8 rounded-sm border border-white/[0.08] bg-stone-900/40 p-5 sm:p-6">
          <h2 className="font-display text-2xl uppercase tracking-wide text-white">
            Dados do cartão
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-400">
            A cobrança é só no cartão de crédito. Este cartão substitui o anterior nas
            próximas renovações.
          </p>
          <div className="mt-5">
            <PagarmePaymentForm
              disabled={submitting}
              submitLabel={submitting ? 'Processando…' : 'Pagar e ativar'}
              onError={onError}
              onSubmit={async (tokenized) => {
                onSubmitStart();
                try {
                  const res = await fetch('/api/subscriptions/upgrade-payment-link', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      token: preview.token,
                      cardToken: tokenized.token,
                      cardLast4: tokenized.last4,
                      cardBrand: tokenized.brand,
                    }),
                  });
                  const payload = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    onError(
                      typeof payload.error === 'string'
                        ? payload.error
                        : 'Não foi possível confirmar o pagamento.'
                    );
                    return;
                  }
                  onPaid(
                    typeof payload.targetPlanName === 'string'
                      ? payload.targetPlanName
                      : preview.targetPlanName
                  );
                } catch {
                  onError('Não foi possível confirmar o pagamento.');
                } finally {
                  onSubmitEnd();
                }
              }}
            />
          </div>
          {error ? (
            <p className="mt-4 text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}
        </section>
      </main>
    </div>
  );
}
