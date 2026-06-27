'use client';

import { useState, useTransition } from 'react';
import { Check, Copy, Mail, MessageCircle } from 'lucide-react';
import { sendPendingPaymentLinkEmailAction } from '@/lib/admin/actions';
import type { PendingPaymentLink } from '@/lib/payments/pending-payment-link';
import { formatMoney } from '@/lib/dashboard/format';

interface Props {
  subscriptionId?: string;
  paymentId?: string;
  customerName?: string | null;
  customerPhone?: string | null;
  planName?: string | null;
  link: PendingPaymentLink;
  whatsappMessage: string;
  whatsappUrl: string;
}

export default function PendingPaymentLinkPanel({
  subscriptionId,
  paymentId,
  customerName,
  customerPhone,
  planName,
  link,
  whatsappMessage,
  whatsappUrl,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sourceLabel =
    link.source === 'asaas'
      ? 'Asaas'
      : link.source === 'stripe'
        ? 'Stripe'
        : 'Painel do cliente';

  return (
    <div className="rounded-sm border border-amber-400/20 bg-amber-500/5 p-4 md:p-5">
      <p className="font-display text-xs uppercase tracking-widest text-amber-200">
        Pagamento pendente
      </p>
      <p className="mt-2 text-sm text-stone-400">
        Link de cobrança via {sourceLabel}
        {planName ? ` · ${planName}` : ''}
        {customerName ? ` · ${customerName}` : ''}
        {' · '}
        <span className="font-mono text-amber-100">{formatMoney(link.amountCents)}</span>
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="flex-1 truncate rounded-sm border border-white/10 bg-stone-950 px-3 py-2 text-xs text-stone-300">
          {link.url}
        </code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(link.url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          }}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-amber-400/30 px-4 py-2 font-display text-xs uppercase tracking-widest text-amber-200 transition hover:bg-amber-500/10"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              Copiado
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copiar link
            </>
          )}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-emerald-300 transition hover:bg-emerald-500/15"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          WhatsApp
        </a>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setMessage(null);
            setError(null);
            startTransition(async () => {
              const result = await sendPendingPaymentLinkEmailAction({
                subscriptionId,
                paymentId,
              });
              if ('error' in result && result.error) {
                setError(result.error);
                return;
              }
              setMessage('E-mail enviado com o link de pagamento.');
            });
          }}
          className="inline-flex cursor-pointer items-center gap-2 rounded-sm border border-console/30 bg-console/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-console transition hover:bg-console/15 disabled:opacity-50"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          {pending ? 'Enviando…' : 'Enviar por e-mail'}
        </button>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-zinc-600">
          Prévia da mensagem WhatsApp
        </summary>
        <pre className="mt-2 whitespace-pre-wrap rounded-sm border border-white/10 bg-stone-950 p-3 text-xs leading-relaxed text-stone-400">
          {whatsappMessage}
        </pre>
      </details>

      {customerPhone ? (
        <p className="mt-3 font-mono text-[10px] text-zinc-600">
          WhatsApp direto para {customerPhone}
        </p>
      ) : null}

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
    </div>
  );
}
