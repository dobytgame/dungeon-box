'use client';

import { Check, Copy, Link2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
  code: string;
  link: string;
}

export default function ReferralLinkCard({ code, link }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-stone-400">
        Compartilhe este link com outros mestres. Quando assinarem e permanecerem
        ativos por 30 dias, você ganha pontos para trocar por produtos da loja.
      </p>

      <div className="rounded-sm border border-white/[0.08] bg-stone-950/50 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
          Seu código
        </p>
        <p className="mt-1 font-display text-2xl tracking-widest text-gold">
          {code}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="min-w-0 flex-1 rounded-sm border border-white/[0.08] bg-stone-950/50 px-4 py-3">
          <div className="flex items-center gap-2 text-stone-500">
            <Link2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate text-sm text-stone-300">{link}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-sm bg-ember px-5 py-3 font-display text-xs uppercase tracking-widest text-stone-950 transition-colors hover:bg-ember/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
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
    </div>
  );
}
