'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Mail } from 'lucide-react';
import { sendSubscriptionPixRenewalEmailAction } from '@/lib/admin/actions';
import type { PixRenewalPreview } from '@/lib/admin/pix-renewal';
import { formatMoney } from '@/lib/dashboard/format';

interface Props {
  preview: PixRenewalPreview;
}

export default function SendPixRenewalEmailPanel({ preview }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actionLabel = preview.pendingPaymentId
    ? 'Reenviar e-mail do PIX'
    : 'Gerar PIX e enviar e-mail';

  return (
    <section className="rounded-sm border border-console/25 bg-console/5 p-5 md:p-6">
      <p className="font-display text-xs uppercase tracking-widest text-console">
        Renovação PIX
      </p>
      <p className="mt-2 text-sm text-stone-400">
        Esta assinatura cobra no PIX, sem cartão recorrente. Gere o código do
        mês e envie o copia e cola por e-mail.
      </p>
      <p className="mt-3 font-mono text-sm text-zinc-200">
        {preview.periodLabel}
        {' · '}
        <span className="text-console">{formatMoney(preview.amountCents)}</span>
      </p>

      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            !window.confirm(
              preview.pendingPaymentId
                ? `Reenviar o PIX de ${formatMoney(preview.amountCents)} (${preview.periodLabel}) por e-mail?`
                : `Gerar um PIX de ${formatMoney(preview.amountCents)} para ${preview.periodLabel} no Asaas e enviar por e-mail?\n\nIsso cria uma cobrança real.`
            )
          ) {
            return;
          }

          setMessage(null);
          setError(null);
          startTransition(async () => {
            const result = await sendSubscriptionPixRenewalEmailAction(
              preview.subscriptionId
            );
            if ('error' in result && result.error) {
              setError(result.error);
              return;
            }
            if (!('success' in result) || !result.success) return;

            setMessage(
              result.reused
                ? `E-mail reenviado com o PIX de ${formatMoney(result.amountCents)} (${result.periodLabel}).`
                : `PIX gerado e e-mail enviado: ${formatMoney(result.amountCents)} (${result.periodLabel}).`
            );
            router.refresh();
          });
        }}
        className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm border border-console/30 bg-console/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-console transition hover:bg-console/15 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Mail className="h-4 w-4" aria-hidden="true" />
        {pending ? 'Enviando…' : actionLabel}
      </button>

      {error ? (
        <p className="mt-3 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 rounded border border-console/30 bg-console/10 px-3 py-2 text-sm text-console">
          {message}
        </p>
      ) : null}
    </section>
  );
}
