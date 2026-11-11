'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  createPixCardMigrationLinkAction,
  sendPixCardMigrationEmailAction,
} from '@/lib/admin/actions';

interface Props {
  subscriptionId: string;
  disabled?: boolean;
  customerEmail?: string | null;
}

export default function AdminPixCardMigrationTools({
  subscriptionId,
  disabled,
  customerEmail,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState('');

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
  }

  function sendEmail() {
    setMessage('');
    setError('');
    setCopiedLink('');
    startTransition(async () => {
      const result = await sendPixCardMigrationEmailAction({ subscriptionId });
      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }
      if ('success' in result && result.success) {
        setMessage(`E-mail enviado${result.email ? ` · ${result.email}` : ''}`);
        if (result.updateLink) setCopiedLink(result.updateLink);
        router.refresh();
      }
    });
  }

  function createAndCopyLink() {
    setMessage('');
    setError('');
    setCopiedLink('');
    startTransition(async () => {
      const result = await createPixCardMigrationLinkAction({ subscriptionId });
      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }
      if ('success' in result && result.success) {
        const ok = await copyText(result.updateLink);
        setCopiedLink(result.updateLink);
        setMessage(ok ? 'Link copiado' : 'Link gerado — copie abaixo');
        router.refresh();
      }
    });
  }

  return (
    <section className="rounded-sm border border-console/25 bg-console/5 p-5 md:p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-console">
        PIX → cartão
      </p>
      <h3 className="mt-2 font-display text-lg uppercase tracking-wide text-white">
        Cadastrar cartão recorrente
      </h3>
      <p className="mt-2 max-w-2xl text-sm text-stone-400">
        Cliente renova via PIX manual. Envie o link para cadastrar cartão no Pagar.me
        {customerEmail ? (
          <>
            {' '}
            para <span className="text-stone-200">{customerEmail}</span>
          </>
        ) : null}
        .
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={disabled || pending}
          onClick={sendEmail}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-sm border border-console/30 bg-console/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-console transition hover:bg-console/15 disabled:opacity-50"
        >
          {pending ? '…' : 'Enviar link por e-mail'}
        </button>
        <button
          type="button"
          disabled={disabled || pending}
          onClick={createAndCopyLink}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-sm border border-white/10 px-4 py-2 font-display text-xs uppercase tracking-widest text-stone-300 transition hover:border-white/20 disabled:opacity-50"
        >
          Copiar link
        </button>
      </div>
      {copiedLink ? (
        <p className="mt-3 break-all font-mono text-xs text-stone-500">{copiedLink}</p>
      ) : null}
      {message ? <p className="mt-3 text-sm text-emerald-200">{message}</p> : null}
      {error ? (
        <p className="mt-3 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
    </section>
  );
}
