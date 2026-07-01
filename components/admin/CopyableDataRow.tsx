'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface Props {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
  copyValue?: string;
}

export default function CopyableDataRow({
  label,
  value,
  mono,
  copyValue,
}: Props) {
  const [copied, setCopied] = useState(false);
  const display = value?.trim() ? value : '—';
  const textToCopy = (copyValue ?? value)?.trim() ?? '';

  async function handleCopy() {
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-1 border-b border-white/[0.04] py-3.5 last:border-0 sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-6">
      <dt className="font-display text-[0.65rem] uppercase tracking-[0.25em] text-stone-500">
        {label}
      </dt>
      <dd className="flex min-w-0 items-start justify-between gap-2">
        <span
          className={`min-w-0 text-sm leading-relaxed text-stone-200 ${
            mono ? 'break-all font-mono text-xs text-stone-400' : ''
          }`}
        >
          {display}
        </span>
        {textToCopy ? (
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded border border-zinc-800 p-1.5 text-zinc-500 transition hover:border-console/30 hover:text-console"
            aria-label={`Copiar ${label.toLowerCase()}`}
            title={copied ? 'Copiado' : 'Copiar'}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        ) : null}
      </dd>
    </div>
  );
}
