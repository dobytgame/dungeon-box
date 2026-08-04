'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  createGatewayMigrationLinkAction,
  sendGatewayMigrationEmailAction,
} from '@/lib/admin/actions';

interface Props {
  subscriptionId: string;
  disabled?: boolean;
  /** compact = botões pequenos (tabela); panel = bloco na página da assinatura */
  variant?: 'compact' | 'panel';
  customerEmail?: string | null;
}

export default function AdminGatewayMigrationTools({
  subscriptionId,
  disabled,
  variant = 'compact',
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
      const result = await sendGatewayMigrationEmailAction({ subscriptionId });
      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }
      if ('success' in result && result.success) {
        setMessage(`E-mail enviado${result.email ? ` · ${result.email}` : ''}`);
        if (result.updateLink) {
          setCopiedLink(result.updateLink);
        }
        router.refresh();
      }
    });
  }

  function createAndCopyLink() {
    setMessage('');
    setError('');
    setCopiedLink('');
    startTransition(async () => {
      const result = await createGatewayMigrationLinkAction({ subscriptionId });
      if ('error' in result && result.error) {
        setError(result.error);
        return;
      }
      if ('success' in result && result.success) {
        const ok = await copyText(result.updateLink);
        setCopiedLink(result.updateLink);
        setMessage(
          ok
            ? 'Link copiado para a área de transferência'
            : 'Link gerado — copie manualmente abaixo'
        );
        router.refresh();
      }
    });
  }

  if (variant === 'panel') {
    return (
      <section className="rounded-sm border border-amber-500/25 bg-amber-500/[0.06] p-5 md:p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-200/80">
          Migração Asaas → Pagar.me
        </p>
        <h3 className="mt-2 font-display text-lg uppercase tracking-wide text-white">
          Atualizar método de pagamento
        </h3>
        <p className="mt-2 max-w-2xl text-sm text-stone-400">
          Gere o link da página pública de atualização de cartão
          {customerEmail ? (
            <>
              {' '}
              para <span className="text-stone-200">{customerEmail}</span>
            </>
          ) : null}
          . Envie por e-mail ou copie para WhatsApp/suporte.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled || pending}
            onClick={sendEmail}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-sm border border-console/40 bg-console/10 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-console transition hover:bg-console/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? 'Processando…' : 'Enviar e-mail'}
          </button>
          <button
            type="button"
            disabled={disabled || pending}
            onClick={createAndCopyLink}
            className="inline-flex min-h-[44px] cursor-pointer items-center rounded-sm border border-white/15 px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-stone-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? 'Processando…' : 'Copiar link'}
          </button>
        </div>

        {copiedLink ? (
          <p className="mt-3 break-all font-mono text-[11px] text-stone-500">
            {copiedLink}
          </p>
        ) : null}
        {message ? (
          <p className="mt-2 font-mono text-[11px] text-emerald-400">{message}</p>
        ) : null}
        {error ? (
          <p className="mt-2 font-mono text-[11px] text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={disabled || pending}
          onClick={sendEmail}
          className="cursor-pointer rounded-sm border border-console/40 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-console transition hover:bg-console/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? '…' : 'E-mail'}
        </button>
        <button
          type="button"
          disabled={disabled || pending}
          onClick={createAndCopyLink}
          className="cursor-pointer rounded-sm border border-white/15 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-stone-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? '…' : 'Link'}
        </button>
      </div>
      {message ? (
        <p className="font-mono text-[10px] text-emerald-400">{message}</p>
      ) : null}
      {error ? (
        <p className="font-mono text-[10px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
