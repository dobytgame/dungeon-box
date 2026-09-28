'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface Props {
  code: string;
}

export default function LoyaltyCouponCopy({ code }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <p className="home-v2-display inline-flex min-h-11 items-center rounded-sm border border-mesa-ember/40 bg-mesa-ink/70 px-4 text-sm tracking-[0.22em] text-mesa-parchment">
        {code}
      </p>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="home-v2-display inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-sm bg-mesa-ember px-4 text-[11px] tracking-[0.14em] text-mesa-ink transition-colors duration-200 hover:bg-[#ff7a4a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mesa-ember"
        aria-label={copied ? 'Código copiado' : `Copiar cupom ${code}`}
      >
        {copied ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}
        {copied ? 'Copiado' : 'Copiar código'}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? `Código ${code} copiado.` : ''}
      </span>
    </div>
  );
}
