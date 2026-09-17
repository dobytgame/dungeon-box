'use client';

import { useState, useTransition } from 'react';
import { Check, Copy, Loader2, Mail } from 'lucide-react';
import {
  adminCustomStoreOrderPayLinkAction,
  adminResendCustomStoreOrderEmailAction,
} from '@/lib/admin/custom-store-order-actions';

interface Props {
  orderId: string;
}

export default function CustomOrderPayLinkBar({ orderId }: Props) {
  const [pending, startTransition] = useTransition();
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function copyLink() {
    setError('');
    startTransition(async () => {
      const result = await adminCustomStoreOrderPayLinkAction(orderId);
      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }
      if (!('url' in result) || !result.url) {
        setError('Não foi possível gerar o link.');
        return;
      }
      setUrl(result.url);
      try {
        await navigator.clipboard.writeText(result.url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        setError('Copie o link abaixo.');
      }
    });
  }

  function resend() {
    setError('');
    setMessage('');
    startTransition(async () => {
      const result = await adminResendCustomStoreOrderEmailAction(orderId);
      if ('error' in result && result.error) {
        setError(result.error);
        if ('url' in result && result.url) setUrl(result.url);
        return;
      }
      if ('url' in result && result.url) setUrl(result.url);
      setMessage('E-mail reenviado.');
    });
  }

  return (
    <section className="admin-panel rounded border border-amber-500/20 bg-amber-500/[0.04] p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-200">
        Aguardando pagamento
      </p>
      <p className="mt-2 text-sm text-stone-400">
        O cliente ainda não pagou. Envie o link para ele escolher PIX ou cartão.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={copyLink}
          disabled={pending}
          className="inline-flex min-h-[40px] items-center gap-2 rounded border border-console/30 px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-console hover:bg-console/10 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : copied ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {copied ? 'Copiado' : 'Copiar link'}
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={pending}
          className="inline-flex min-h-[40px] items-center gap-2 rounded border border-zinc-700 px-4 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-300 hover:border-zinc-600 disabled:opacity-50"
        >
          <Mail className="h-3.5 w-3.5" aria-hidden="true" />
          Reenviar e-mail
        </button>
      </div>
      {url ? (
        <p className="mt-3 break-all font-mono text-[11px] text-zinc-500">{url}</p>
      ) : null}
      {message ? <p className="mt-2 text-sm text-console">{message}</p> : null}
      {error ? (
        <p className="mt-2 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
